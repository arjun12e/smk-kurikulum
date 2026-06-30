/**
 * Core Engine Algoritma Genetika — Optimasi Penjadwalan SMK
 *
 * Kromosom: array of BLOK (sesi), bukan per-JP.
 * Gen (blok): { id_kontrak, durasi, butuhRuangan, id_ruangan, hari, waktu_shift, slot_mulai }
 *   Satu blok = beberapa JP berurutan di hari & ruangan yang sama
 *   (slot_mulai .. slot_mulai+durasi-1).
 *
 * KONSEP BLOCKING (sesuai kebutuhan):
 *   JP satu mapel-rombel dikelompokkan per hari, rata-rata 3–4 jam:
 *     - total <= maks/hari  -> satu blok dalam satu hari
 *     - total >  maks/hari  -> dipecah merata ke beberapa hari
 *   Tujuan: murid tidak berpindah ruangan di tengah sesi & guru mengajar
 *   satu rombel sampai selesai. Blok dijamin berurutan & satu ruangan.
 *
 * RESTRICTED ENCODING ruangan:
 *   - Mapel Produktif -> hanya Lab/Bengkel milik jurusan mapel/rombel.
 *   - Mapel lainnya    -> hanya ruangan Teori.
 *   JP "diluar" (mapel.jp_diluar) & kontrak PKL tetap dijadwalkan tapi
 *   TANPA ruangan (id_ruangan = null) — muncul di kalender, tak memakai ruang.
 *
 * Hard Constraint (penalti -1000 per pelanggaran):
 *   1. Guru bentrok di slot yang sama
 *   2. Ruangan bentrok di slot yang sama (hanya blok ber-ruangan)
 *   3. Rombel bentrok di slot yang sama
 *   4. Dua blok mapel-rombel yang sama jatuh di hari yang sama (harus beda hari)
 *   5. (pengaman) Ruangan tidak sesuai jenis/jurusan — normalnya 0
 *
 * Soft Constraint (skor 0.0–1.0):
 *   - kepuasan preferensi hari & shift × bobot kasta guru (ditimbang durasi)
 */

const { KontrakMengajar, Guru, MataPelajaran, Rombel, Ruangan, JadwalOptimal, Setting } = require('../models');

const BOBOT_KASTA = { GTY: 3, PNS: 2, GTT: 1 };

// Konfigurasi waktu per mode kurikulum.
//  dua_sesi : Senin-Sabtu, 2 sesi (Pagi/Siang), 8 jam/sesi.
//  satu_sesi: Senin-Jumat, 1 sesi, 10 jam/hari (~50 JP/minggu).
const MODE_CONFIG = {
  dua_sesi: { HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], WAKTU_SHIFT: ['Pagi', 'Siang'], SLOT_PER_SHIFT: 8 },
  satu_sesi: { HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], WAKTU_SHIFT: ['Pagi'], SLOT_PER_SHIFT: 10 },
};

// Hanya mapel produktif yang wajib di Lab/Bengkel jurusan. Sisanya di ruang Teori.
const KATEGORI_PRAKTIK = ['Produktif'];
const PENALTI = 1000;

// Maksimal JP per hari untuk satu mapel-rombel (blocking). Rata-rata 3–4 jam.
const MAKS_JP_PER_HARI = 4;

const POPULASI_SIZE = 50;
const MAX_GENERASI = 200;
const PROB_CROSSOVER = 0.85;
const PROB_MUTASI = 0.15;
const TOURNAMENT_SIZE = 5;
const ELITISM = 2;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pick(arr) {
  return arr[randomInt(arr.length)];
}

/**
 * Membagi total JP menjadi blok-blok harian yang merata, tiap blok <= blokMaks.
 *   4  -> [4]        (cukup satu hari)
 *   6  -> [3, 3]     (dipecah dua hari)
 *   5  -> [3, 2]
 *   12 -> [4, 4, 4]
 *   18 -> [4, 4, 4, 3, 3]
 */
function partisiBlok(total, blokMaks) {
  if (total <= 0) return [];
  const jumlahHari = Math.ceil(total / blokMaks);
  const dasar = Math.floor(total / jumlahHari);
  const sisa = total % jumlahHari;
  const blok = [];
  for (let i = 0; i < jumlahHari; i++) blok.push(dasar + (i < sisa ? 1 : 0));
  return blok;
}

// Slot acak untuk satu blok berdurasi `durasi` (tetap muat dalam satu shift).
function randomSlotBlok(durasi, cfg) {
  const maxMulai = Math.max(1, cfg.SLOT_PER_SHIFT - durasi + 1);
  return {
    hari: pick(cfg.HARI),
    waktu_shift: pick(cfg.WAKTU_SHIFT),
    slot_mulai: randomInt(maxMulai) + 1,
  };
}

/**
 * Jurusan penentu ruangan untuk sebuah kontrak.
 * Prioritas: jurusan mapel (eksplisit) -> jurusan rombel (fallback).
 */
function jurusanKontrak(kontrak) {
  return kontrak.MataPelajaran?.id_jurusan || kontrak.Rombel?.jurusan || null;
}

/**
 * Daftar id_ruangan yang valid untuk sebuah kontrak.
 * - Produktif -> ruangan yang daftar mapelnya memuat mapel ini (utama);
 *               fallback: Lab/Bengkel milik jurusan mapel/rombel, lalu lab mana pun, lalu semua.
 * - Lainnya    -> ruang Teori (fallback: ruangan apa pun).
 */
function hitungKandidatRuangan(kontrak, indeksRuangan) {
  const { teori, praktikByJurusan, semuaPraktik, semua, mapelToRooms } = indeksRuangan;
  const kategori = kontrak.MataPelajaran?.kategori_mapel;
  const jurusan = jurusanKontrak(kontrak);

  if (KATEGORI_PRAKTIK.includes(kategori)) {
    // 1) Ruangan yang secara eksplisit mengizinkan mapel ini
    const byMapel = mapelToRooms[kontrak.id_mapel];
    if (byMapel && byMapel.length) return byMapel;
    // 2) Fallback ke aturan jurusan
    const milikJurusan = praktikByJurusan[jurusan];
    if (milikJurusan && milikJurusan.length) return milikJurusan;
    if (semuaPraktik.length) return semuaPraktik;
    return semua;
  }

  if (teori.length) return teori;
  return semua;
}

function hitungHardConstraint(kromosom, kontrakMap, ruanganMap, cfg) {
  let penalti = 0;
  const guruSlot = {};
  const ruanganSlot = {};
  const rombelSlot = {};
  const kontrakHari = {}; // mapel-rombel sebaiknya beda hari tiap blok

  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;

    // 4. Dua blok kontrak yang sama di hari yang sama -> harus beda hari
    const khKey = `${gen.id_kontrak}-${gen.hari}`;
    if (kontrakHari[khKey]) penalti += PENALTI;
    else kontrakHari[khKey] = true;

    // Pengaman batas slot (normalnya tidak terjadi karena init/mutasi valid)
    if (gen.slot_mulai < 1 || gen.slot_mulai + gen.durasi - 1 > cfg.SLOT_PER_SHIFT) {
      penalti += PENALTI;
    }

    // Cek bentrok per sel jam yang ditempati blok
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;

      // 1. Guru bentrok (berlaku untuk semua, termasuk JP diluar/PKL)
      const guruKey = `${kontrak.id_guru}-${key}`;
      if (guruSlot[guruKey]) penalti += PENALTI;
      else guruSlot[guruKey] = true;

      // 3. Rombel bentrok (berlaku untuk semua)
      const rombelKey = `${kontrak.id_rombel}-${key}`;
      if (rombelSlot[rombelKey]) penalti += PENALTI;
      else rombelSlot[rombelKey] = true;

      // 2. Ruangan bentrok (hanya blok ber-ruangan)
      if (gen.id_ruangan) {
        const ruanganKey = `${gen.id_ruangan}-${key}`;
        if (ruanganSlot[ruanganKey]) penalti += PENALTI;
        else ruanganSlot[ruanganKey] = true;
      }
    }

    // 5. Pengaman jenis/jurusan ruangan (sekali per blok ber-ruangan)
    if (gen.id_ruangan) {
      const ruangan = ruanganMap[gen.id_ruangan];
      const kategori = kontrak.MataPelajaran?.kategori_mapel;
      if (KATEGORI_PRAKTIK.includes(kategori)) {
        const jurusan = jurusanKontrak(kontrak);
        if (!ruangan || ruangan.jenis_ruangan === 'Teori') penalti += PENALTI;
        else if (ruangan.id_jurusan && jurusan && ruangan.id_jurusan !== jurusan) penalti += PENALTI;
      } else if (ruangan && ruangan.jenis_ruangan !== 'Teori') {
        penalti += PENALTI;
      }
    }
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
    const prefHari = preferensi.hari || preferensi;
    const prefShift = preferensi.shift || { Pagi: 3, Siang: 3 };

    const nilaiHari = prefHari[gen.hari] || 1;
    const nilaiShift = prefShift[gen.waktu_shift] || 1;

    // Ditimbang durasi blok agar adil terhadap blok panjang/pendek
    totalSkor += (nilaiHari + nilaiShift) * bobot * gen.durasi;
    maxSkor += 10 * bobot * gen.durasi;
  }

  return maxSkor > 0 ? totalSkor / maxSkor : 0;
}

function hitungFitness(kromosom, kontrakMap, ruanganMap, cfg) {
  const penalti = hitungHardConstraint(kromosom, kontrakMap, ruanganMap, cfg);
  const soft = hitungSoftConstraint(kromosom, kontrakMap);
  return -penalti + soft * 100;
}

// unitList: [{ id_kontrak, blok: [durasi,...], butuhRuangan }]
function inisialisasiKromosom(unitList, kandidatMap, cfg) {
  const kromosom = [];
  for (const unit of unitList) {
    const kandidat = kandidatMap[unit.id_kontrak];
    for (const durasi of unit.blok) {
      kromosom.push({
        id_kontrak: unit.id_kontrak,
        durasi,
        butuhRuangan: unit.butuhRuangan,
        id_ruangan: unit.butuhRuangan ? pick(kandidat) : null,
        ...randomSlotBlok(durasi, cfg),
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

function mutasi(kromosom, kandidatMap, cfg) {
  return kromosom.map(gen => {
    if (Math.random() >= PROB_MUTASI) return gen;

    const baru = { ...gen };
    if (!gen.butuhRuangan) {
      // Blok tanpa ruangan (JP diluar/PKL): hanya pindah slot waktu.
      Object.assign(baru, randomSlotBlok(gen.durasi, cfg));
      return baru;
    }
    // Blok ber-ruangan: ubah ruangan dan/atau slot (minimal satu).
    const kandidat = kandidatMap[gen.id_kontrak];
    const ubahRuangan = Math.random() < 0.5;
    if (ubahRuangan) baru.id_ruangan = pick(kandidat);
    if (!ubahRuangan || Math.random() < 0.5) Object.assign(baru, randomSlotBlok(gen.durasi, cfg));
    return baru;
  });
}

async function jalankan(onProgress) {
  const kontrakList = await KontrakMengajar.findAll({
    include: [
      { model: Guru },
      { model: MataPelajaran },
      { model: Rombel },
    ],
  });
  const ruanganList = (await Ruangan.findAll()).map(r => r.toJSON());

  if (kontrakList.length === 0) throw new Error('Tidak ada kontrak mengajar untuk dijadwalkan');
  if (ruanganList.length === 0) throw new Error('Tidak ada ruangan yang tersedia');

  // Konfigurasi waktu sesuai mode kurikulum
  const setting = await Setting.findByPk(1);
  const mode = setting?.mode_kurikulum === 'satu_sesi' ? 'satu_sesi' : 'dua_sesi';
  const cfg = MODE_CONFIG[mode];

  // Index ruangan
  const ruanganMap = {};
  const semua = [];
  const teori = [];
  const semuaPraktik = [];
  const praktikByJurusan = {};
  const mapelToRooms = {}; // id_mapel -> [id_ruangan yang mengizinkan mapel itu]
  for (const r of ruanganList) {
    ruanganMap[r.id_ruangan] = r;
    semua.push(r.id_ruangan);
    if (r.jenis_ruangan === 'Teori') {
      teori.push(r.id_ruangan);
    } else {
      semuaPraktik.push(r.id_ruangan);
      if (r.id_jurusan) {
        (praktikByJurusan[r.id_jurusan] = praktikByJurusan[r.id_jurusan] || []).push(r.id_ruangan);
      }
      // id_mapel_list dari model = array (getter)
      (r.id_mapel_list || []).forEach(idm => {
        (mapelToRooms[idm] = mapelToRooms[idm] || []).push(r.id_ruangan);
      });
    }
  }
  const indeksRuangan = { teori, praktikByJurusan, semuaPraktik, semua, mapelToRooms };

  // Map kontrak + bagi JP menjadi blok harian (ber-ruangan / tanpa-ruangan)
  const kontrakMap = {};
  const kandidatMap = {};
  const unitList = [];
  let totalJpDiluar = 0;
  let totalKontrakPkl = 0;

  kontrakList.forEach(k => {
    const kj = k.toJSON();
    kontrakMap[kj.id_kontrak] = kj;
    kandidatMap[kj.id_kontrak] = hitungKandidatRuangan(kj, indeksRuangan);

    const totalJp = kj.jumlah_jp || 0;
    if (totalJp <= 0) return;

    // Maks JP/hari untuk blocking: minimum dari aturan global, batas kontrak, & kapasitas shift.
    const blokMaks = Math.min(MAKS_JP_PER_HARI, kj.max_jam_harian || MAKS_JP_PER_HARI, cfg.SLOT_PER_SHIFT);

    if (kj.is_pkl || kj.Rombel?.is_pkl) {
      totalKontrakPkl++;
      unitList.push({ id_kontrak: kj.id_kontrak, blok: partisiBlok(totalJp, blokMaks), butuhRuangan: false });
      return;
    }

    const jpDiluar = Math.min(kj.MataPelajaran?.jp_diluar || 0, totalJp);
    const jpDalam = totalJp - jpDiluar;
    totalJpDiluar += jpDiluar;
    if (jpDalam > 0) unitList.push({ id_kontrak: kj.id_kontrak, blok: partisiBlok(jpDalam, blokMaks), butuhRuangan: true });
    if (jpDiluar > 0) unitList.push({ id_kontrak: kj.id_kontrak, blok: partisiBlok(jpDiluar, blokMaks), butuhRuangan: false });
  });

  if (unitList.length === 0) throw new Error('Tidak ada JP yang perlu dijadwalkan');

  let populasi = Array.from({ length: POPULASI_SIZE }, () =>
    inisialisasiKromosom(unitList, kandidatMap, cfg)
  );

  let bestKromosom = null;
  let bestFitness = -Infinity;

  for (let gen = 0; gen < MAX_GENERASI; gen++) {
    const fitnessArr = populasi.map(k => hitungFitness(k, kontrakMap, ruanganMap, cfg));

    fitnessArr.forEach((f, i) => {
      if (f > bestFitness) {
        bestFitness = f;
        bestKromosom = populasi[i];
      }
    });

    if (onProgress) onProgress({ generasi: gen + 1, fitness: bestFitness });

    // Elitism
    const urutan = fitnessArr.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]);
    const generasiBaru = [];
    for (let e = 0; e < ELITISM && e < urutan.length; e++) {
      generasiBaru.push(populasi[urutan[e][1]]);
    }

    while (generasiBaru.length < POPULASI_SIZE) {
      const p1 = seleksiTournament(populasi, fitnessArr);
      const p2 = seleksiTournament(populasi, fitnessArr);
      const anak = mutasi(crossover(p1, p2), kandidatMap, cfg);
      generasiBaru.push(anak);
    }
    populasi = generasiBaru;
  }

  const penaltiAkhir = hitungHardConstraint(bestKromosom, kontrakMap, ruanganMap, cfg);
  const pelanggaranHard = Math.round(penaltiAkhir / PENALTI);

  // Simpan: tiap blok di-expand menjadi baris per-JP berurutan (skema DB tetap)
  await JadwalOptimal.destroy({ where: {} });
  const rows = [];
  for (const gen of bestKromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    for (let i = 0; i < gen.durasi; i++) {
      rows.push({
        id_rombel: kontrak.id_rombel,
        id_kontrak: gen.id_kontrak,
        id_ruangan: gen.id_ruangan,
        hari: gen.hari,
        slot_jam: gen.slot_mulai + i,
        waktu_shift: gen.waktu_shift,
      });
    }
  }
  await JadwalOptimal.bulkCreate(rows);

  return { fitness: bestFitness, totalJadwal: rows.length, pelanggaranHard, jpDiluar: totalJpDiluar, kontrakPkl: totalKontrakPkl };
}

module.exports = { jalankan };
