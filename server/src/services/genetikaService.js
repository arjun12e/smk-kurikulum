/**
 * Core Engine Algoritma Genetika — Optimasi Penjadwalan SMK
 *
 * Kromosom: array of gen, satu gen per JP yang dijadwalkan
 * Gen: { id_kontrak, id_ruangan, hari, slot_jam, waktu_shift }
 *
 * Hard Constraint (penalti -1000 per pelanggaran):
 *   1. Guru bentrok di slot yang sama
 *   2. Ruangan bentrok di slot yang sama
 *   3. Mapel Produktif/Kejuruan harus di Lab/Bengkel
 *   4. Rombel bentrok di slot yang sama
 *
 * Soft Constraint (skor 0.0–1.0):
 *   - kepuasan preferensi hari × bobot kasta guru
 */

const { KontrakMengajar, Guru, MataPelajaran, Ruangan, JadwalOptimal, sequelize } = require('../models');

const BOBOT_KASTA = { GTY: 3, PNS: 2, GTT: 1 };
const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SLOT_PER_SHIFT = 5;
const WAKTU_SHIFT = ['Pagi', 'Siang'];

const POPULASI_SIZE = 50;
const MAX_GENERASI = 200;
const PROB_CROSSOVER = 0.85;
const PROB_MUTASI = 0.15;
const TOURNAMENT_SIZE = 5;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function randomSlot() {
  return {
    hari: HARI[randomInt(HARI.length)],
    slot_jam: randomInt(SLOT_PER_SHIFT) + 1,
    waktu_shift: WAKTU_SHIFT[randomInt(WAKTU_SHIFT.length)],
  };
}

function slotKey(hari, slot_jam, waktu_shift) {
  return `${hari}-${waktu_shift}-${slot_jam}`;
}

function hitungHardConstraint(kromosom, kontrakMap, ruanganMap) {
  let penalti = 0;
  const guruSlot = {};
  const ruanganSlot = {};
  const rombelSlot = {};

  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;
    const key = slotKey(gen.hari, gen.slot_jam, gen.waktu_shift);

    // 1. Guru bentrok
    const guruKey = `${kontrak.id_guru}-${key}`;
    if (guruSlot[guruKey]) penalti += 1000;
    else guruSlot[guruKey] = true;

    // 2. Ruangan bentrok
    const ruanganKey = `${gen.id_ruangan}-${key}`;
    if (ruanganSlot[ruanganKey]) penalti += 1000;
    else ruanganSlot[ruanganKey] = true;

    // 3. Mapel Produktif/Kejuruan harus Lab/Bengkel
    const mapelKategori = kontrak.MataPelajaran?.kategori_mapel;
    const ruanganJenis = ruanganMap[gen.id_ruangan]?.jenis_ruangan;
    if (['Produktif', 'Pelajaran Kejuruan'].includes(mapelKategori)) {
      if (!['Lab', 'Bengkel'].includes(ruanganJenis)) penalti += 1000;
    }

    // 4. Rombel bentrok
    const rombelKey = `${kontrak.id_rombel}-${key}`;
    if (rombelSlot[rombelKey]) penalti += 1000;
    else rombelSlot[rombelKey] = true;
  }

  return penalti;
}

function hitungSoftConstraint(kromosom, kontrakMap) {
  let totalSkor = 0;
  let maxSkor = 0;

  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;

    const bobot = BOBOT_KASTA[kontrak.Guru?.status_kepegawaian] || 1;
    const preferensi = kontrak.preferensi_hari || {};
    
    // Support format lama & baru
    const prefHari = preferensi.hari || preferensi; 
    const prefShift = preferensi.shift || { Pagi: 3, Siang: 3 };

    const nilaiHari = prefHari[gen.hari] || 1;
    const nilaiShift = prefShift[gen.waktu_shift] || 1;

    // Nilai Hari (max 5) + Nilai Shift (max 5) = Max 10 per gen
    totalSkor += (nilaiHari + nilaiShift) * bobot;
    maxSkor += 10 * bobot;
  }

  return maxSkor > 0 ? totalSkor / maxSkor : 0;
}

function hitungFitness(kromosom, kontrakMap, ruanganMap) {
  const penalti = hitungHardConstraint(kromosom, kontrakMap, ruanganMap);
  const soft = hitungSoftConstraint(kromosom, kontrakMap);
  return -penalti + soft * 100;
}

function inisialisasiKromosom(kontrakList, ruanganIds) {
  const kromosom = [];
  for (const kontrak of kontrakList) {
    for (let jp = 0; jp < kontrak.jumlah_jp; jp++) {
      kromosom.push({
        id_kontrak: kontrak.id_kontrak,
        id_ruangan: ruanganIds[randomInt(ruanganIds.length)],
        ...randomSlot(),
      });
    }
  }
  return kromosom;
}

function seleksiTournament(populasi, fitnessArr) {
  let best = null;
  for (let i = 0; i < TOURNAMENT_SIZE; i++) {
    const idx = randomInt(populasi.length);
    if (best === null || fitnessArr[idx] > fitnessArr[best]) best = idx;
  }
  return populasi[best];
}

function crossover(parent1, parent2) {
  if (Math.random() > PROB_CROSSOVER) return [...parent1];
  const point = randomInt(parent1.length);
  return [...parent1.slice(0, point), ...parent2.slice(point)];
}

function mutasi(kromosom, ruanganIds) {
  return kromosom.map(gen => {
    if (Math.random() < PROB_MUTASI) {
      return {
        ...gen,
        id_ruangan: ruanganIds[randomInt(ruanganIds.length)],
        ...randomSlot(),
      };
    }
    return gen;
  });
}

async function jalankan(onProgress) {
  // Load semua data ke memori
  const kontrakList = await KontrakMengajar.findAll({
    include: [
      { model: Guru },
      { model: MataPelajaran },
    ],
  });
  const ruanganList = await Ruangan.findAll();

  const kontrakMap = {};
  kontrakList.forEach(k => { kontrakMap[k.id_kontrak] = k.toJSON(); });

  const ruanganMap = {};
  const ruanganIds = [];
  ruanganList.forEach(r => {
    ruanganMap[r.id_ruangan] = r.toJSON();
    ruanganIds.push(r.id_ruangan);
  });

  if (kontrakList.length === 0) throw new Error('Tidak ada kontrak mengajar untuk dijadwalkan');

  // Inisialisasi populasi
  let populasi = Array.from({ length: POPULASI_SIZE }, () =>
    inisialisasiKromosom(kontrakList, ruanganIds)
  );

  let bestKromosom = null;
  let bestFitness = -Infinity;

  for (let gen = 0; gen < MAX_GENERASI; gen++) {
    const fitnessArr = populasi.map(k => hitungFitness(k, kontrakMap, ruanganMap));

    // Track best
    fitnessArr.forEach((f, i) => {
      if (f > bestFitness) {
        bestFitness = f;
        bestKromosom = populasi[i];
      }
    });

    if (onProgress) onProgress({ generasi: gen + 1, fitness: bestFitness });

    // Buat generasi baru
    const generasiBaru = [];
    while (generasiBaru.length < POPULASI_SIZE) {
      const p1 = seleksiTournament(populasi, fitnessArr);
      const p2 = seleksiTournament(populasi, fitnessArr);
      const anak = mutasi(crossover(p1, p2), ruanganIds);
      generasiBaru.push(anak);
    }
    populasi = generasiBaru;
  }

  // Simpan hasil terbaik
  await JadwalOptimal.destroy({ where: {} });
  const rows = bestKromosom.map(gen => {
    const kontrak = kontrakMap[gen.id_kontrak];
    return {
      id_rombel: kontrak.id_rombel,
      id_kontrak: gen.id_kontrak,
      id_ruangan: gen.id_ruangan,
      hari: gen.hari,
      slot_jam: gen.slot_jam,
      waktu_shift: gen.waktu_shift,
    };
  });
  await JadwalOptimal.bulkCreate(rows);

  return { fitness: bestFitness, totalJadwal: rows.length };
}

module.exports = { jalankan };
