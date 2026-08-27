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
 *   5. Kapasitas slot: jatah JP per hari/sesi dari pengaturan (jadwal khusus)
 *   6. SATU HARI SATU SESI: rombel boleh Pagi atau Siang di hari mana pun,
 *      tapi dalam satu hari tidak boleh berada di dua sesi sekaligus.
 *   Jatah JP per kontrak dijamin BY CONSTRUCTION (blok = persis jumlah_jp).
 *
 * REDESAIN: batasan sesi per rombel (Rombel.sesi / sesi_hari Pagi-Siang) BUKAN
 * lagi hard constraint — rombel bebas ditempatkan di sesi mana pun agar jadwal
 * bebas bentrok. Hanya hari 'Libur' yang tetap dihormati.
 *
 * Soft Constraint (penalti kecil, tidak mengalahkan hard):
 *   - produktif terpaksa di ruang Teori (lab penuh)        → PENALTI_RUANGAN/JP
 *   - preferensi HARI guru (kontrak.preferensi_hari 1..5)  → makin rendah nilai
 *     hari terpilih makin besar penalti, ditimbang kasta guru (GTY>PNS>GTT)
 */

const { KontrakMengajar, Guru, MataPelajaran, Rombel, Ruangan, JadwalOptimal, Setting } = require('../models');

const BOBOT_KASTA = { GTY: 3, PNS: 2, GTT: 1 };

// Konfigurasi waktu per mode kurikulum.
//  dua_sesi : Senin-Sabtu, 2 sesi (Pagi/Siang), 8 jam/sesi.
//  satu_sesi: Senin-Sabtu (TETAP 6 hari), 1 sesi, maks 14 JP/hari —
//             menampung hari nyata yang panjang (upacara Senin, Jumat sampai sore)
//             tanpa memodelkan jadwal khusus per hari di algoritma, dan tanpa
//             memaksakan semua JP ke 5 hari (rawan bentrok).
// SLOT = kapasitas JP per sesi (dua_sesi: Pagi 8 + Siang 6 = 14/hari). SLOT_PER_SHIFT
// = kapasitas terbesar (dipakai untuk batas ukuran blok & fallback).
const MODE_CONFIG = {
  dua_sesi: { HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], WAKTU_SHIFT: ['Pagi', 'Siang'], SLOT: { Pagi: 8, Siang: 6 }, SLOT_PER_SHIFT: 8 },
  satu_sesi: { HARI: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], WAKTU_SHIFT: ['Pagi'], SLOT: { Pagi: 14 }, SLOT_PER_SHIFT: 14 },
};

// Hanya mapel produktif yang wajib di Lab/Bengkel jurusan. Sisanya di ruang Teori.
const KATEGORI_PRAKTIK = ['Produktif'];
const PENALTI = 1000;              // pelanggaran KERAS (bentrok) — dominan
const PENALTI_RUANGAN = 40;        // preferensi LUNAK: produktif tidak di lab/bengkel jurusannya
const PENALTI_PREFERENSI = 2;      // preferensi LUNAK: per poin (5-nilai) per JP × bobot kasta
                                   // maks (5-1)×3×2 = 24/JP < PENALTI_RUANGAN < PENALTI
const PENALTI_LUBANG = 5;          // kerapatan LUNAK: per sel kosong di tengah hari rombel
                                   // (atau telat mulai) — dorong jadwal rapat dari jam ke-1
const PENALTI_OLAHRAGA = 12;       // olahraga (PJOK) tidak di JAM AWAL sesi — per slot mundur

// Maksimal JP per hari untuk satu mapel-rombel (blocking). Rata-rata 3–4 jam.
const MAKS_JP_PER_HARI = 4;

// Kelonggaran rencana sesi rombel: kapasitas rencana >= beban + margin, supaya
// packing tidak dituntut sempurna 100% (rencana pas-pasan = bentrok macet).
const MARGIN_PLAN = 4;

const POPULASI_SIZE = 200;
const MAX_GENERASI = 300;
const PROB_CROSSOVER = 0.85;
const PROB_MUTASI = 0.15;
const TOURNAMENT_SIZE = 5;
const ELITISM = 2;
// Berhenti lebih awal bila solusi sudah bebas pelanggaran & tidak membaik selama N generasi
const STAGNAN_MAX = 30;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function pick(arr) {
  return arr[randomInt(arr.length)];
}

// Fisher-Yates shuffle (salinan baru)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

// Kapasitas slot sebuah (hari, shift). Per sesi (Pagi 8 / Siang 6); hari khusus lebih pendek.
function kapasitasSlot(cfg, hari, shift) {
  const base = (cfg.SLOT && cfg.SLOT[shift] != null) ? cfg.SLOT[shift] : cfg.SLOT_PER_SHIFT;
  const khusus = cfg.KHUSUS[`${hari}-${shift}`];
  if (khusus != null) return Math.min(khusus, base);
  return base;
}

// Daftar pasangan {hari, shift} yang boleh dipakai rombel.
// REDESAIN: batasan sesi per rombel DIHAPUS — semua sesi diperbolehkan di semua
// hari agar penjadwal leluasa mencari solusi bebas bentrok. Yang tetap dihormati
// hanya hari 'Libur' pada sesi_hari (rombel memang tidak masuk hari itu).
// Aturan "satu hari satu sesi" dijaga oleh hard constraint #6, bukan di sini.
function rombelSesiHari(rombel, cfg) {
  const map = rombel?.sesi_hari || {};
  const out = [];
  for (const hari of cfg.HARI) {
    if (map[hari] === 'Libur') continue;
    for (const shift of cfg.WAKTU_SHIFT) out.push({ hari, shift });
  }
  return out.length ? out : cfg.HARI.flatMap(h => cfg.WAKTU_SHIFT.map(s => ({ hari: h, shift: s })));
}

// Slot acak untuk satu blok — pilih pasangan (hari, sesi) yang diizinkan rombel.
function randomSlotBlok(durasi, cfg, hariShiftList) {
  const list = hariShiftList && hariShiftList.length ? hariShiftList : cfg.HARI.map(h => ({ hari: h, shift: cfg.WAKTU_SHIFT[0] }));
  for (let coba = 0; coba < 40; coba++) {
    const { hari, shift } = pick(list);
    const kap = kapasitasSlot(cfg, hari, shift);
    if (kap < durasi) continue;
    return { hari, waktu_shift: shift, slot_mulai: randomInt(kap - durasi + 1) + 1 };
  }
  const f = list[0];
  return { hari: f.hari, waktu_shift: f.shift, slot_mulai: 1 };
}

/**
 * Jurusan penentu ruangan untuk sebuah kontrak.
 * Prioritas: jurusan mapel (eksplisit) -> jurusan rombel (fallback).
 */
function jurusanKontrak(kontrak) {
  return kontrak.MataPelajaran?.id_jurusan || kontrak.Rombel?.jurusan || null;
}

/**
 * Daftar id_ruangan yang valid untuk sebuah kontrak (urutan = prioritas).
 * - Produktif -> Lab/Bengkel jurusannya DULU, lalu ruang Teori sebagai FALLBACK
 *               (dipakai bila lab/bengkel penuh). Penempatan di teori kena
 *               penalti lunak (PENALTI_RUANGAN) agar hanya dipakai saat perlu.
 * - Lainnya    -> ruang Teori (fallback: ruangan apa pun).
 */
function hitungKandidatRuangan(kontrak, indeksRuangan) {
  const { teori, praktikByJurusan, semuaPraktik, semua, mapelToRooms } = indeksRuangan;
  const kategori = kontrak.MataPelajaran?.kategori_mapel;

  if (KATEGORI_PRAKTIK.includes(kategori)) {
    const jurusan = jurusanKontrak(kontrak);
    // Lab utama: daftar mapel eksplisit -> lab jurusan -> semua lab
    let lab = mapelToRooms[kontrak.id_mapel];
    if (!lab || !lab.length) lab = praktikByJurusan[jurusan];
    if (!lab || !lab.length) lab = semuaPraktik;
    // Lab dulu, teori sebagai fallback (biar tidak pernah gagal dijadwalkan)
    const kandidat = [...(lab || []), ...teori];
    return kandidat.length ? kandidat : semua;
  }

  if (teori.length) return teori;
  return semua;
}

// Penalti LUNAK: mapel produktif yang "terpaksa" ditempatkan di ruang Teori
// (karena lab/bengkel jurusannya penuh). Kecil, agar hanya dipilih saat perlu.
function hitungPenaltiRuangan(kromosom, kontrakMap, ruanganMap) {
  let p = 0;
  for (const gen of kromosom) {
    if (!gen.id_ruangan) continue;
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!KATEGORI_PRAKTIK.includes(kontrak?.MataPelajaran?.kategori_mapel)) continue;
    const ruangan = ruanganMap[gen.id_ruangan];
    if (!ruangan || ruangan.jenis_ruangan === 'Teori') p += PENALTI_RUANGAN * gen.durasi;
  }
  return p;
}

// Penalti LUNAK: kerapatan hari rombel. Menghitung sel kosong DI TENGAH rentang
// terisi (lubang yang tak bisa diisi mapel lain) plus keterlambatan mulai
// (slot pertama > jam ke-1). Mendorong hari padat dari jam 1 — waktu luang
// terkumpul utuh di akhir hari.
function hitungPenaltiLubang(kromosom, kontrakMap) {
  const agg = new Map(); // `${rombel}|${hari}|${shift}` -> { min, max, count }
  for (const gen of kromosom) {
    const k = kontrakMap[gen.id_kontrak];
    if (!k) continue;
    const key = `${k.id_rombel}|${gen.hari}|${gen.waktu_shift}`;
    let a = agg.get(key);
    if (!a) { a = { min: Infinity, max: -Infinity, count: 0 }; agg.set(key, a); }
    if (gen.slot_mulai < a.min) a.min = gen.slot_mulai;
    const akhir = gen.slot_mulai + gen.durasi - 1;
    if (akhir > a.max) a.max = akhir;
    a.count += gen.durasi;
  }
  let p = 0;
  for (const a of agg.values()) {
    p += Math.max(0, (a.max - a.min + 1) - a.count); // lubang internal
    p += a.min - 1;                                   // telat mulai
  }
  return p * PENALTI_LUBANG;
}

// Penalti LUNAK: blok olahraga (PJOK) sebaiknya di JAM AWAL sesi (slot 1).
// Tiap slot mundur dikenai penalti — GA terdorong menaruh olahraga pagi-pagi
// (atau awal sesi siang bila rombel belajar pagi).
function hitungPenaltiOlahraga(kromosom) {
  let p = 0;
  for (const gen of kromosom) {
    if (gen.olahraga) p += (gen.slot_mulai - 1) * PENALTI_OLAHRAGA;
  }
  return p;
}

// Normalisasi preferensi hari kontrak. Mendukung dua format penyimpanan:
//   - datar     : { Senin: 5, Selasa: 1, ... }
//   - bersarang : { hari: { Senin: 5, ... }, shift: { Pagi: 3, ... } }  (format form)
function prefHariKontrak(kontrak) {
  const p = kontrak?.preferensi_hari;
  if (!p) return {};
  if (p.hari && typeof p.hari === 'object') return p.hari;
  return p;
}

// Preferensi SESI guru { Pagi: 1..5, Siang: 1..5 } — hanya ada pada format bersarang.
function prefShiftKontrak(kontrak) {
  const p = kontrak?.preferensi_hari;
  return (p && p.shift && typeof p.shift === 'object') ? p.shift : {};
}

// Penalti LUNAK: preferensi HARI guru. Nilai 5 = sangat suka (penalti 0),
// 1 = sangat tidak suka. Hari tanpa nilai dianggap netral (3). Ditimbang bobot
// kasta (GTY 3 > PNS 2 > GTT 1) × durasi — guru senior lebih diprioritaskan.
function hitungPenaltiPreferensi(kromosom, kontrakMap) {
  let p = 0;
  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;
    const bobot = BOBOT_KASTA[kontrak.Guru?.status_kepegawaian] || 1;
    // preferensi HARI
    const pref = prefHariKontrak(kontrak);
    const nilai = pref[gen.hari] != null ? pref[gen.hari] : 3;
    p += PENALTI_PREFERENSI * (5 - nilai) * bobot * gen.durasi;
    // preferensi SESI (Pagi/Siang) — bobot sama, tetap soft constraint
    const prefS = prefShiftKontrak(kontrak);
    const nilaiS = prefS[gen.waktu_shift] != null ? prefS[gen.waktu_shift] : 3;
    p += PENALTI_PREFERENSI * (5 - nilaiS) * bobot * gen.durasi;
  }
  return p;
}

// fixedOcc: okupansi jadwal yang SUDAH ada (mode incremental) — blok baru bentrok
// bila menabraknya. { guru:Set, rombel:Set, ruang:Set } berisi key `id-hari-shift-slot`.
function hitungHardConstraint(kromosom, kontrakMap, ruanganMap, cfg, fixedOcc) {
  let penalti = 0;
  const guruSlot = {};
  const ruanganSlot = {};
  const rombelSlot = {};
  const kontrakHari = {}; // mapel-rombel sebaiknya beda hari tiap blok
  const rombelShiftHari = {}; // `${id_rombel}-${hari}` -> sesi pertama yang dipakai
  const fx = fixedOcc || { guru: new Set(), rombel: new Set(), ruang: new Set(), rombelShift: {} };

  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;

    // 4. Dua blok BER-RUANGAN kontrak yang sama di hari yang sama -> harus beda hari.
    if (gen.butuhRuangan) {
      const khKey = `${gen.id_kontrak}-${gen.hari}`;
      if (kontrakHari[khKey]) penalti += PENALTI;
      else kontrakHari[khKey] = true;
    }

    // 6. SATU HARI SATU SESI: seluruh kegiatan rombel pada hari yang sama harus
    //    berada di sesi yang sama (Pagi ATAU Siang, tidak keduanya).
    //    PENGECUALIAN: blok olahraga (PJOK) boleh di sesi lain hari itu.
    if (!gen.olahraga) {
      const rsKey = `${kontrak.id_rombel}-${gen.hari}`;
      const fxShiftSet = fx.rombelShift ? fx.rombelShift[rsKey] : null;
      if (fxShiftSet && !fxShiftSet.has(gen.waktu_shift)) penalti += PENALTI;
      if (rombelShiftHari[rsKey] && rombelShiftHari[rsKey] !== gen.waktu_shift) penalti += PENALTI;
      else if (!rombelShiftHari[rsKey]) rombelShiftHari[rsKey] = gen.waktu_shift;
    }

    // Batas slot: hormati kapasitas per hari/shift (hari khusus lebih pendek)
    if (gen.slot_mulai < 1 || gen.slot_mulai + gen.durasi - 1 > kapasitasSlot(cfg, gen.hari, gen.waktu_shift)) {
      penalti += PENALTI;
    }

    // Cek bentrok per sel jam yang ditempati blok
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;

      // 1. Guru bentrok (termasuk vs jadwal lama)
      const guruKey = `${kontrak.id_guru}-${key}`;
      if (guruSlot[guruKey] || fx.guru.has(guruKey)) penalti += PENALTI;
      else guruSlot[guruKey] = true;

      // 3. Rombel bentrok (termasuk vs jadwal lama)
      const rombelKey = `${kontrak.id_rombel}-${key}`;
      if (rombelSlot[rombelKey] || fx.rombel.has(rombelKey)) penalti += PENALTI;
      else rombelSlot[rombelKey] = true;

      // 2. Ruangan bentrok (hanya blok ber-ruangan; termasuk vs jadwal lama).
      //    WAJIB aktif: inilah yang membuat lab "penuh" sehingga produktif
      //    dialihkan ke ruang teori.
      if (gen.id_ruangan) {
        const ruanganKey = `${gen.id_ruangan}-${key}`;
        if (ruanganSlot[ruanganKey] || fx.ruang.has(ruanganKey)) penalti += PENALTI;
        else ruanganSlot[ruanganKey] = true;
      }
    }
    // Catatan: preferensi lab/teori diurus lewat penalti LUNAK (hitungPenaltiRuangan).
  }

  return penalti;
}

// Audit rincian pelanggaran KERAS pada satu kromosom (untuk diagnosa penyebab
// terbesar bentrok). Menghitung per-jenis, tidak memengaruhi seleksi.
function auditPelanggaran(kromosom, kontrakMap, cfg, fixedOcc) {
  const guruSlot = {}, ruanganSlot = {}, rombelSlot = {}, kontrakHari = {}, rombelShiftHari = {};
  const fx = fixedOcc || { guru: new Set(), rombel: new Set(), ruang: new Set(), rombelShift: {} };
  const out = { guru: 0, rombel: 0, ruangan: 0, bedaHari: 0, sesiGanda: 0, kapasitas: 0, total: 0 };

  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (!kontrak) continue;

    if (gen.butuhRuangan) {
      const khKey = `${gen.id_kontrak}-${gen.hari}`;
      if (kontrakHari[khKey]) out.bedaHari++; else kontrakHari[khKey] = true;
    }
    if (!gen.olahraga) {
      const rsKey = `${kontrak.id_rombel}-${gen.hari}`;
      const fxShiftSet = fx.rombelShift ? fx.rombelShift[rsKey] : null;
      if (fxShiftSet && !fxShiftSet.has(gen.waktu_shift)) out.sesiGanda++;
      if (rombelShiftHari[rsKey] && rombelShiftHari[rsKey] !== gen.waktu_shift) out.sesiGanda++;
      else if (!rombelShiftHari[rsKey]) rombelShiftHari[rsKey] = gen.waktu_shift;
    }
    if (gen.slot_mulai < 1 || gen.slot_mulai + gen.durasi - 1 > kapasitasSlot(cfg, gen.hari, gen.waktu_shift)) {
      out.kapasitas++;
    }
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
      const guruKey = `${kontrak.id_guru}-${key}`;
      if (guruSlot[guruKey] || fx.guru.has(guruKey)) out.guru++; else guruSlot[guruKey] = true;
      const rombelKey = `${kontrak.id_rombel}-${key}`;
      if (rombelSlot[rombelKey] || fx.rombel.has(rombelKey)) out.rombel++; else rombelSlot[rombelKey] = true;
      if (gen.id_ruangan) {
        const ruanganKey = `${gen.id_ruangan}-${key}`;
        if (ruanganSlot[ruanganKey] || fx.ruang.has(ruanganKey)) out.ruangan++; else ruanganSlot[ruanganKey] = true;
      }
    }
  }
  out.total = out.guru + out.rombel + out.ruangan + out.bedaHari + out.sesiGanda + out.kapasitas;
  return out;
}

// Fitness = -(pelanggaran keras + penalti lunak ruangan). Bentrok jauh lebih mahal
// daripada preferensi ruangan, sehingga algoritma memakai lab dulu & baru pindah
// ke teori bila lab penuh (daripada menimbulkan bentrok).
function hitungFitness(kromosom, kontrakMap, ruanganMap, cfg, fixedOcc) {
  const hard = hitungHardConstraint(kromosom, kontrakMap, ruanganMap, cfg, fixedOcc);
  let f = -hard
    - hitungPenaltiRuangan(kromosom, kontrakMap, ruanganMap)
    - hitungPenaltiPreferensi(kromosom, kontrakMap)
    - hitungPenaltiOlahraga(kromosom);
  // Kerapatan hanya dinilai bagi kromosom yang SUDAH bebas bentrok — kromosom
  // bentrok dibiarkan "longgar" agar mudah direparasi (butuh ruang manuver).
  if (hard === 0) f -= hitungPenaltiLubang(kromosom, kontrakMap);
  return f;
}

// blokList: [{ idx, id_kontrak, durasi, butuhRuangan }] — urutan idx SAMA di semua
// kromosom agar one-point crossover valid. hariShiftMap[id_kontrak] = pasangan (hari,sesi) valid.
function inisialisasiKromosom(blokList, kandidatMap, cfg, hariShiftMap) {
  return blokList.map(b => ({
    id_kontrak: b.id_kontrak,
    durasi: b.durasi,
    butuhRuangan: b.butuhRuangan,
    olahraga: b.olahraga || false,
    id_ruangan: b.butuhRuangan ? pick(kandidatMap[b.id_kontrak]) : null,
    ...randomSlotBlok(b.durasi, cfg, hariShiftMap[b.id_kontrak]),
  }));
}

/**
 * RENCANA SESI per rombel-hari (aturan satu-hari-satu-sesi).
 * Tiap rombel diberi satu sesi untuk tiap harinya SEBELUM blok ditempatkan:
 *   - mulai dari pilihan sesi acak per hari (diversitas antar kromosom + memba-
 *     gi beban ruangan antara Pagi/Siang),
 *   - lalu hari-hari di-upgrade ke sesi berkapasitas lebih besar (acak) sampai
 *     total kapasitas >= beban JP rombel — rombel berbeban berat otomatis
 *     mendapat lebih banyak hari Pagi (8 JP) daripada Siang (6 JP).
 * Hari yang sudah terkunci jadwal lama (incremental) tidak diubah.
 */
function rencanaSesiRombel(blokList, kontrakMap, cfg, hariShiftMap, fixedShift) {
  const beban = {};
  const hariShiftRombel = {}; // id_rombel -> { hari: [shift yang diizinkan] }
  for (const b of blokList) {
    const k = kontrakMap[b.id_kontrak];
    if (!k) continue;
    // Blok olahraga tidak dihitung: ia boleh menempati sesi lain (di luar rencana)
    if (!b.olahraga) beban[k.id_rombel] = (beban[k.id_rombel] || 0) + b.durasi;
    if (!hariShiftRombel[k.id_rombel]) {
      const m = {};
      (hariShiftMap[b.id_kontrak] || []).forEach(p => { (m[p.hari] = m[p.hari] || []).push(p.shift); });
      hariShiftRombel[k.id_rombel] = m;
    }
  }
  // SADAR-RUANGAN GLOBAL: lacak sisa daya tampung ruangan per (hari, sesi) agar
  // rombel TERSEBAR antara Pagi/Siang — tidak semua menumpuk di satu sesi
  // sampai ruangan jebol. Rombel diproses dalam urutan acak (diversitas).
  const totalRuang = cfg.TOTAL_RUANG || 9999;
  const sisa = {}, kapTotal = {};
  for (const hari of cfg.HARI) {
    for (const shift of cfg.WAKTU_SHIFT) {
      const c = totalRuang * kapasitasSlot(cfg, hari, shift);
      sisa[`${hari}-${shift}`] = c;
      kapTotal[`${hari}-${shift}`] = c || 1;
    }
  }

  const plan = {};
  for (const idR of shuffle(Object.keys(beban))) {
    const m = hariShiftRombel[idR];
    const L = beban[idR];
    const target = L + MARGIN_PLAN;
    const days = Object.entries(m);
    const pilih = {};
    let total = 0;

    // Pilih sesi per hari: yang utilisasi ruangannya paling LONGGAR (relatif)
    for (const [hari, shifts] of days) {
      const locked = fixedShift[`${idR}-${hari}`];
      let s = shifts[0];
      if (locked && shifts.includes(locked)) s = locked;
      else {
        let best = -Infinity;
        for (const sh of shuffle(shifts)) {
          const frac = sisa[`${hari}-${sh}`] / kapTotal[`${hari}-${sh}`];
          if (frac > best) { best = frac; s = sh; }
        }
      }
      pilih[hari] = s;
      total += kapasitasSlot(cfg, hari, s);
    }

    // Upgrade hari ke sesi berkapasitas lebih besar, menuju sesi paling longgar:
    //  - WAJIB  : sampai kapasitas menutup beban (tanpa ini pasti bentrok),
    //  - OPSIONAL: margin ekstra, hanya bila sesi tujuan masih longgar — agar
    //    rombel tidak berbondong-bondong ke Pagi sampai ruangan jebol.
    while (total < target) {
      let bestDay = null, bestShift = null, bestGain = 0, bestFrac = -Infinity;
      for (const [hari, shifts] of days) {
        if (fixedShift[`${idR}-${hari}`]) continue;
        for (const sh of shifts) {
          const gain = kapasitasSlot(cfg, hari, sh) - kapasitasSlot(cfg, hari, pilih[hari]);
          if (gain <= 0) continue;
          const frac = sisa[`${hari}-${sh}`] / kapTotal[`${hari}-${sh}`];
          if (frac > bestFrac) { bestFrac = frac; bestDay = hari; bestShift = sh; bestGain = gain; }
        }
      }
      if (!bestDay) break; // tidak ada upgrade tersisa (beban memang melebihi kapasitas)
      if (total >= L && bestFrac < 0.15) break; // margin opsional: sesi tujuan sudah sesak
      pilih[bestDay] = bestShift;
      total += bestGain;
    }

    // Komit: kurangi sisa daya tampung sesi terpilih proporsional beban rombel
    for (const [hari] of days) {
      const s = pilih[hari];
      sisa[`${hari}-${s}`] -= L * (kapasitasSlot(cfg, hari, s) / (total || 1));
      plan[`${idR}-${hari}`] = s;
    }
  }
  return plan;
}

/**
 * Inisialisasi GREEDY sadar-bentrok: blok ditempatkan satu per satu (yang paling
 * panjang dulu) ke slot yang masih bebas guru/rombel/ruangan. Urutan hari/sesi/
 * slot/ruangan diacak sehingga tiap kromosom greedy tetap beragam. Fallback acak
 * bila tak ada slot bebas. Hasil ditulis pada posisi idx kanonik.
 */
function greedyKromosom(blokList, kandidatMap, kontrakMap, cfg, fixedOcc, hariShiftMap) {
  // Seed okupansi dari jadwal lama (mode incremental)
  const guruOcc = new Set(fixedOcc ? fixedOcc.guru : []);
  const rombelOcc = new Set(fixedOcc ? fixedOcc.rombel : []);
  const ruangOcc = new Set(fixedOcc ? fixedOcc.ruang : []);
  const kontrakHari = new Set();
  // Kunci sesi rombel-hari dari jadwal lama (mode incremental)
  const fixedShift = {};
  if (fixedOcc && fixedOcc.rombelShift) {
    for (const [k, set] of Object.entries(fixedOcc.rombelShift)) fixedShift[k] = set.values().next().value;
  }
  // Rencana sesi per rombel-hari — menjamin satu-hari-satu-sesi DAN kapasitas cukup
  const planSesi = rencanaSesiRombel(blokList, kontrakMap, cfg, hariShiftMap, fixedShift);
  const hasil = new Array(blokList.length);

  const urutan = [...blokList].sort((a, b) => b.durasi - a.durasi);

  for (const b of urutan) {
    const kontrak = kontrakMap[b.id_kontrak];
    const kandidat = kandidatMap[b.id_kontrak];
    const pairs = hariShiftMap[b.id_kontrak] || cfg.HARI.map(h => ({ hari: h, shift: cfg.WAKTU_SHIFT[0] }));
    const pref = prefHariKontrak(kontrak);
    // Penempatan LEAST-CONFLICT: pindai semua (hari,sesi,slot) yang diizinkan,
    // skor tiap kandidat = jumlah bentrok (guru + rombel + ruangan per-JP) +
    // pelanggaran beda-hari. Ambil skor terkecil; berhenti dini bila menemukan
    // penempatan sempurna (skor 0). Urutan diacak agar 120 kromosom greedy beragam.
    let placed = null;
    let bestScore = Infinity;

    // Hari dicoba berurutan dari preferensi guru TERTINGGI (shuffle dulu agar
    // hari bernilai sama tetap acak antar kromosom → populasi beragam).
    const pairsUrut = shuffle(pairs).sort((a, z) => {
      const na = pref[a.hari] != null ? pref[a.hari] : 3;
      const nz = pref[z.hari] != null ? pref[z.hari] : 3;
      return nz - na;
    });

    outer:
    for (const { hari, shift } of pairsUrut) {
      // Beda-hari (hard #4) hanya untuk blok ber-ruangan.
      const langgarBedaHari = b.butuhRuangan && kontrakHari.has(`${b.id_kontrak}-${hari}`);
      // Satu hari satu sesi (hard #6): ikuti rencana sesi rombel untuk hari ini.
      // Blok olahraga BEBAS sesi (boleh berlawanan dengan sesi belajar rombel).
      const planShift = planSesi[`${kontrak.id_rombel}-${hari}`];
      if (!b.olahraga && planShift && planShift !== shift) continue;
      const maxMulai = kapasitasSlot(cfg, hari, shift) - b.durasi + 1;
      if (maxMulai < 1) continue;
      // Scan mulai MENAIK (first-fit dari kiri) → blok merapat ke awal hari, waktu
      // luang berkumpul jadi ekor kontigu di akhir hari — cegah 1 JP terjebak.
      for (let mulai = 1; mulai <= maxMulai; mulai++) {
        // Bentrok guru & rombel di sepanjang rentang blok
        let konflik = langgarBedaHari ? 1 : 0;
        for (let s = mulai; s < mulai + b.durasi; s++) {
          const key = `${hari}-${shift}-${s}`;
          if (guruOcc.has(`${kontrak.id_guru}-${key}`)) konflik++;
          if (rombelOcc.has(`${kontrak.id_rombel}-${key}`)) konflik++;
        }
        // Ruangan: pilih kandidat (lab jurusan dulu → teori) dengan bentrok paling sedikit
        let ridPilih = null;
        if (b.butuhRuangan) {
          let terbaik = Infinity;
          for (const rid of kandidat) {
            let c = 0;
            for (let s = mulai; s < mulai + b.durasi; s++) if (ruangOcc.has(`${rid}-${hari}-${shift}-${s}`)) c++;
            if (c < terbaik) { terbaik = c; ridPilih = rid; if (c === 0) break; }
          }
          konflik += terbaik === Infinity ? 0 : terbaik;
        }
        if (konflik < bestScore) {
          bestScore = konflik;
          placed = { hari, waktu_shift: shift, slot_mulai: mulai, id_ruangan: ridPilih };
          if (konflik === 0) break outer; // penempatan sempurna
        }
      }
    }

    if (!placed) {
      // Fallback pun tetap mengikuti rencana sesi rombel agar tidak menciptakan sesi ganda
      const pairsPlan = b.olahraga ? pairs : pairs.filter(p => (planSesi[`${kontrak.id_rombel}-${p.hari}`] || p.shift) === p.shift);
      placed = { ...randomSlotBlok(b.durasi, cfg, pairsPlan.length ? pairsPlan : pairs), id_ruangan: b.butuhRuangan ? pick(kandidat) : null };
    }

    if (b.butuhRuangan) kontrakHari.add(`${b.id_kontrak}-${placed.hari}`);
    for (let s = placed.slot_mulai; s < placed.slot_mulai + b.durasi; s++) {
      const key = `${placed.hari}-${placed.waktu_shift}-${s}`;
      guruOcc.add(`${kontrak.id_guru}-${key}`);
      rombelOcc.add(`${kontrak.id_rombel}-${key}`);
      if (placed.id_ruangan) ruangOcc.add(`${placed.id_ruangan}-${key}`);
    }

    hasil[b.idx] = { id_kontrak: b.id_kontrak, durasi: b.durasi, butuhRuangan: b.butuhRuangan, olahraga: b.olahraga || false, ...placed };
  }

  return hasil;
}

/**
 * PERBAIKAN LOKAL pasca-GA: blok yang masih melanggar hard constraint dicabut
 * lalu direlokasi ke penempatan yang 100% bebas pelanggaran (sesi rombel-hari
 * konsisten, guru/rombel/ruangan bebas, kapasitas & beda-hari terpenuhi).
 * Bila relokasi langsung gagal, coba EJEKSI depth-2: pindahkan dulu satu blok
 * lain (rombel/guru yang sama) ke tempat kosong agar membuka ruang, lalu blok
 * bentrok masuk ke ruang yang baru terbuka. Diulang beberapa lintasan.
 */
function perbaikanLokal(kromosom, kontrakMap, kandidatMap, cfg, fixedOcc, hariShiftMap, maxPass = 6, bolehSplit = false) {
  const fx = fixedOcc || { guru: new Set(), rombel: new Set(), ruang: new Set(), rombelShift: {} };
  const add = (map, k, d) => {
    const v = (map.get(k) || 0) + d;
    if (v <= 0) map.delete(k); else map.set(k, v);
  };

  // Okupansi global — dibangun sekali, dirawat inkremental lewat pasang(±1)
  const guruOcc = new Map(), rombelOcc = new Map(), ruangOcc = new Map();
  const kontrakHariCnt = new Map();      // `${id_kontrak}-${hari}` -> jumlah blok ber-ruangan
  const rombelShiftHari = new Map();     // `${id_rombel}-${hari}` -> Map(shift -> jumlah blok)
  const pasang = (gen, kontrak, d) => {
    if (gen.butuhRuangan) add(kontrakHariCnt, `${gen.id_kontrak}-${gen.hari}`, d);
    if (!gen.olahraga) { // blok olahraga tidak menentukan/terikat sesi rombel-hari
      const rsKey = `${kontrak.id_rombel}-${gen.hari}`;
      if (!rombelShiftHari.has(rsKey)) rombelShiftHari.set(rsKey, new Map());
      add(rombelShiftHari.get(rsKey), gen.waktu_shift, d);
    }
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
      add(guruOcc, `${kontrak.id_guru}-${key}`, d);
      add(rombelOcc, `${kontrak.id_rombel}-${key}`, d);
      if (gen.id_ruangan) add(ruangOcc, `${gen.id_ruangan}-${key}`, d);
    }
  };
  for (const gen of kromosom) {
    const kontrak = kontrakMap[gen.id_kontrak];
    if (kontrak) pasang(gen, kontrak, 1);
  }

  // Cek satu titik (hari, shift, mulai): kembalikan penempatan lengkap (dengan
  // ruangan bebas) bila 100% bebas pelanggaran, selain itu null.
  const cekTempat = (gen, kontrak, hari, shift, mulai) => {
    for (let s = mulai; s < mulai + gen.durasi; s++) {
      const key = `${hari}-${shift}-${s}`;
      if ((guruOcc.get(`${kontrak.id_guru}-${key}`) || 0) > 0 || fx.guru.has(`${kontrak.id_guru}-${key}`)
        || (rombelOcc.get(`${kontrak.id_rombel}-${key}`) || 0) > 0 || fx.rombel.has(`${kontrak.id_rombel}-${key}`)) return null;
    }
    if (!gen.butuhRuangan) return { hari, waktu_shift: shift, slot_mulai: mulai, id_ruangan: null };
    for (const rid of (kandidatMap[gen.id_kontrak] || [])) {
      let ok = true;
      for (let s = mulai; s < mulai + gen.durasi; s++) {
        const key = `${hari}-${shift}-${s}`;
        if ((ruangOcc.get(`${rid}-${key}`) || 0) > 0 || fx.ruang.has(`${rid}-${key}`)) { ok = false; break; }
      }
      if (ok) return { hari, waktu_shift: shift, slot_mulai: mulai, id_ruangan: rid };
    }
    return null;
  };

  // Guard tingkat (hari, shift) untuk gen: aturan beda-hari & satu-hari-satu-sesi
  const bolehHariShift = (gen, kontrak, hari, shift) => {
    if (gen.butuhRuangan && (kontrakHariCnt.get(`${gen.id_kontrak}-${hari}`) || 0) > 0) return false;
    if (!gen.olahraga) { // olahraga bebas sesi
      const rsKey = `${kontrak.id_rombel}-${hari}`;
      const shifts = rombelShiftHari.get(rsKey);
      if (shifts && shifts.size && !shifts.has(shift)) return false;
      const fxSet = fx.rombelShift ? fx.rombelShift[rsKey] : null;
      if (fxSet && !fxSet.has(shift)) return false;
    }
    return true;
  };

  // Cari penempatan 100% bebas pelanggaran untuk gen (yang SUDAH dicabut dari okupansi)
  const cariBebas = (gen, kontrak) => {
    const pairs = hariShiftMap[gen.id_kontrak] || [];
    for (const { hari, shift } of shuffle(pairs)) {
      if (!bolehHariShift(gen, kontrak, hari, shift)) continue;
      const maxMulai = kapasitasSlot(cfg, hari, shift) - gen.durasi + 1;
      for (let mulai = 1; mulai <= maxMulai; mulai++) {
        const t = cekTempat(gen, kontrak, hari, shift, mulai);
        if (t) return t;
      }
    }
    return null;
  };

  // EJEKSI TERARAH: cari titik yang terhalang TEPAT SATU blok lain (bukan jadwal
  // tetap) — kembalikan titik + indeks blok penghalangnya.
  const cariBlocker = (gen, kontrak) => {
    const pairs = hariShiftMap[gen.id_kontrak] || [];
    let coba = 0;
    for (const { hari, shift } of shuffle(pairs)) {
      if (!bolehHariShift(gen, kontrak, hari, shift)) continue;
      const maxMulai = kapasitasSlot(cfg, hari, shift) - gen.durasi + 1;
      for (let mulai = 1; mulai <= maxMulai && coba < 120; mulai++) {
        coba++;
        // Jadwal tetap (incremental) tidak bisa diejeksi
        let fxBlok = false;
        for (let s = mulai; s < mulai + gen.durasi; s++) {
          const key = `${hari}-${shift}-${s}`;
          if (fx.guru.has(`${kontrak.id_guru}-${key}`) || fx.rombel.has(`${kontrak.id_rombel}-${key}`)) { fxBlok = true; break; }
        }
        if (fxBlok) continue;
        // Kumpulkan blok penghalang guru/rombel di rentang ini
        const blockerSet = new Set();
        for (let idx = 0; idx < kromosom.length; idx++) {
          const g3 = kromosom[idx];
          if (g3.hari !== hari || g3.waktu_shift !== shift) continue;
          if (g3.slot_mulai + g3.durasi <= mulai || g3.slot_mulai >= mulai + gen.durasi) continue;
          const k3 = kontrakMap[g3.id_kontrak];
          if (!k3) continue;
          if (k3.id_guru === kontrak.id_guru || k3.id_rombel === kontrak.id_rombel) blockerSet.add(idx);
        }
        if (blockerSet.size < 1 || blockerSet.size > 2) continue;
        return { hari, shift, mulai, blockers: [...blockerSet] };
      }
    }
    return null;
  };

  // Daftar indeks gen yang terlibat pelanggaran (dibaca dari okupansi terkini)
  const genBermasalah = () => {
    const out = [];
    kromosom.forEach((gen, gi) => {
      const kontrak = kontrakMap[gen.id_kontrak];
      if (!kontrak) return;
      let masalah = gen.slot_mulai < 1
        || gen.slot_mulai + gen.durasi - 1 > kapasitasSlot(cfg, gen.hari, gen.waktu_shift);
      if (!masalah && gen.butuhRuangan && kontrakHariCnt.get(`${gen.id_kontrak}-${gen.hari}`) > 1) masalah = true;
      const rsKey = `${kontrak.id_rombel}-${gen.hari}`;
      const fxSet = fx.rombelShift ? fx.rombelShift[rsKey] : null;
      if (!masalah && !gen.olahraga && ((rombelShiftHari.get(rsKey) || new Map()).size > 1 || (fxSet && !fxSet.has(gen.waktu_shift)))) masalah = true;
      if (!masalah) {
        for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
          const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
          if ((guruOcc.get(`${kontrak.id_guru}-${key}`) || 0) > 1 || fx.guru.has(`${kontrak.id_guru}-${key}`)
            || (rombelOcc.get(`${kontrak.id_rombel}-${key}`) || 0) > 1 || fx.rombel.has(`${kontrak.id_rombel}-${key}`)
            || (gen.id_ruangan && ((ruangOcc.get(`${gen.id_ruangan}-${key}`) || 0) > 1 || fx.ruang.has(`${gen.id_ruangan}-${key}`)))) {
            masalah = true; break;
          }
        }
      }
      if (masalah) out.push(gi);
    });
    return out;
  };

  let terbaik = null;
  let terbaikN = Infinity;
  let tanpaProgres = 0;

  for (let pass = 0; pass < maxPass; pass++) {
    const bermasalah = genBermasalah();
    if (bermasalah.length < terbaikN) {
      terbaikN = bermasalah.length;
      terbaik = kromosom.map(g => ({ ...g }));
    }
    if (!bermasalah.length) break;

    let adaPerbaikan = false;
    for (const gi of bermasalah) {
      const gen = kromosom[gi];
      const kontrak = kontrakMap[gen.id_kontrak];
      pasang(gen, kontrak, -1);

      let baru = cariBebas(gen, kontrak);

      // EJEKSI TERARAH: cari titik yang cuma dihalangi 1-2 blok — usir blok-blok
      // itu ke tempat kosong lain, lalu blok bentrok masuk ke titik yang terbuka.
      if (!baru) {
        const target = cariBlocker(gen, kontrak);
        if (target) {
          const asal = target.blockers.map(idx => ({ idx, gen: kromosom[idx], kontrak: kontrakMap[kromosom[idx].id_kontrak] }));
          asal.forEach(b => pasang(b.gen, b.kontrak, -1));
          const spotB = cekTempat(gen, kontrak, target.hari, target.shift, target.mulai);
          if (spotB) {
            pasang({ ...gen, ...spotB }, kontrak, 1); // duduki dulu agar blocker tak kembali ke sini
            const pindahan = [];
            let semuaDapat = true;
            for (const b of asal) {
              const t = cariBebas(b.gen, b.kontrak);
              if (!t) { semuaDapat = false; break; }
              const gBaru = { ...b.gen, ...t };
              pasang(gBaru, b.kontrak, 1);
              pindahan.push({ idx: b.idx, gBaru, kontrak: b.kontrak });
            }
            pasang({ ...gen, ...spotB }, kontrak, -1);
            if (semuaDapat) {
              pindahan.forEach(p => { kromosom[p.idx] = p.gBaru; });
              baru = spotB;
            } else {
              // batal: cabut yang sudah terlanjur pindah, kembalikan semua blocker
              pindahan.forEach(p => pasang(p.gBaru, p.kontrak, -1));
              asal.forEach(b => pasang(b.gen, b.kontrak, 1));
            }
          } else {
            asal.forEach(b => pasang(b.gen, b.kontrak, 1));
          }
        }
      }

      // EJEKSI ACAK (fallback): pindahkan satu blok se-rombel / se-guru ke tempat
      // kosong mana pun, lalu coba relokasi lagi.
      if (!baru) {
        const kandidatEjeksi = [];
        kromosom.forEach((g3, idx) => {
          if (idx === gi) return;
          const k3 = kontrakMap[g3.id_kontrak];
          if (!k3) return;
          if (k3.id_rombel === kontrak.id_rombel || k3.id_guru === kontrak.id_guru) kandidatEjeksi.push(idx);
        });
        for (const ej of shuffle(kandidatEjeksi)) {
          const g3 = kromosom[ej];
          const k3 = kontrakMap[g3.id_kontrak];
          pasang(g3, k3, -1);
          const tempat3 = cariBebas(g3, k3);
          if (tempat3) {
            const g3baru = { ...g3, ...tempat3 };
            pasang(g3baru, k3, 1);
            baru = cariBebas(gen, kontrak);
            if (baru) { kromosom[ej] = g3baru; break; }
            pasang(g3baru, k3, -1);   // batal: kembalikan blok ejeksi ke posisi lama
            pasang(g3, k3, 1);
          } else {
            pasang(g3, k3, 1);
          }
        }
      }

      // PECAH BLOK (hanya perbaikan final): blok tak termuat utuh di mana pun —
      // bagi dua agar muat di celah-celah yang tersisa. Jalan terakhir.
      // Blok OLAHRAGA tidak pernah dipecah (JP olahraga harus utuh).
      if (!baru && bolehSplit && gen.durasi >= 2 && !gen.olahraga) {
        const d1 = Math.ceil(gen.durasi / 2);
        const d2 = gen.durasi - d1;
        const tA = cariBebas({ ...gen, durasi: d1 }, kontrak);
        if (tA) {
          const gA = { ...gen, durasi: d1, ...tA };
          pasang(gA, kontrak, 1);
          const tB = cariBebas({ ...gen, durasi: d2 }, kontrak);
          pasang(gA, kontrak, -1);
          if (tB) {
            const gB = { ...gen, durasi: d2, ...tB };
            kromosom[gi] = gA;          // separuh pertama menggantikan gen lama
            kromosom.push(gB);          // separuh kedua jadi gen baru
            pasang(gB, kontrak, 1);
            adaPerbaikan = true;
          }
        }
      }

      if (baru) { kromosom[gi] = { ...gen, ...baru }; adaPerbaikan = true; }
      pasang(kromosom[gi], kontrak, 1);
    }

    if (adaPerbaikan) {
      tanpaProgres = 0;
    } else {
      tanpaProgres++;
      if (tanpaProgres >= 3) break;
      // GUNCANGAN: mandek — pindahkan satu blok bermasalah ke posisi acak yang
      // valid strukturnya (boleh bentrok sementara) agar keluar dari kemacetan;
      // pass berikutnya mencoba menata ulang dari konfigurasi baru.
      const macet = genBermasalah();
      if (macet.length) {
        const gi = pick(macet);
        const gen = kromosom[gi];
        const kontrak = kontrakMap[gen.id_kontrak];
        pasang(gen, kontrak, -1);
        const pairs = (hariShiftMap[gen.id_kontrak] || []).filter(p => bolehHariShift(gen, kontrak, p.hari, p.shift));
        if (pairs.length) {
          const p = pick(pairs);
          const maxMulai = Math.max(1, kapasitasSlot(cfg, p.hari, p.shift) - gen.durasi + 1);
          kromosom[gi] = {
            ...gen, hari: p.hari, waktu_shift: p.shift, slot_mulai: randomInt(maxMulai) + 1,
            id_ruangan: gen.butuhRuangan ? pick(kandidatMap[gen.id_kontrak] || [null]) : null,
          };
        }
        pasang(kromosom[gi], kontrak, 1);
      }
    }
  }

  // Kembalikan keadaan TERBAIK yang pernah dicapai (guncangan bisa berakhir lebih buruk)
  const akhirN = genBermasalah().length;
  return (terbaik && terbaikN < akhirN) ? terbaik : kromosom;
}

/**
 * KOMPAKSI KIRI (pasca-perbaikan): geser blok tiap (rombel, hari, sesi) merapat
 * ke jam ke-1 tanpa menciptakan bentrok baru — waktu kosong terkumpul di akhir
 * hari (siswa pulang lebih awal), tidak ada 1 JP kosong terjebak di tengah.
 */
function kompaksiKiri(kromosom, kontrakMap, kandidatMap, cfg, fixedOcc) {
  const fx = fixedOcc || { guru: new Set(), rombel: new Set(), ruang: new Set() };
  const add = (map, k, d) => {
    const v = (map.get(k) || 0) + d;
    if (v <= 0) map.delete(k); else map.set(k, v);
  };
  const guruOcc = new Map(), rombelOcc = new Map(), ruangOcc = new Map();
  const pasangCells = (gen, kontrak, d) => {
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
      add(guruOcc, `${kontrak.id_guru}-${key}`, d);
      add(rombelOcc, `${kontrak.id_rombel}-${key}`, d);
      if (gen.id_ruangan) add(ruangOcc, `${gen.id_ruangan}-${key}`, d);
    }
  };
  kromosom.forEach(gen => {
    const k = kontrakMap[gen.id_kontrak];
    if (k) pasangCells(gen, k, 1);
  });

  for (let iter = 0; iter < 3; iter++) {
    let bergerak = false;
    // Kelompokkan blok per (rombel, hari, sesi)
    const grup = new Map();
    kromosom.forEach((gen, gi) => {
      const k = kontrakMap[gen.id_kontrak];
      if (!k) return;
      const key = `${k.id_rombel}|${gen.hari}|${gen.waktu_shift}`;
      if (!grup.has(key)) grup.set(key, []);
      grup.get(key).push(gi);
    });

    for (const idxs of grup.values()) {
      idxs.sort((a, b) => kromosom[a].slot_mulai - kromosom[b].slot_mulai);
      let cursor = 1;
      for (const gi of idxs) {
        const gen = kromosom[gi];
        const kontrak = kontrakMap[gen.id_kontrak];
        if (gen.slot_mulai > cursor) {
          pasangCells(gen, kontrak, -1);
          let best = gen.slot_mulai;
          let bestRuangan = gen.id_ruangan;
          cariGeser:
          for (let mulai = cursor; mulai < gen.slot_mulai; mulai++) {
            // guru & rombel harus bebas di posisi baru
            let bebas = true;
            for (let s = mulai; s < mulai + gen.durasi; s++) {
              const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
              if ((guruOcc.get(`${kontrak.id_guru}-${key}`) || 0) > 0 || fx.guru.has(`${kontrak.id_guru}-${key}`)
                || (rombelOcc.get(`${kontrak.id_rombel}-${key}`) || 0) > 0 || fx.rombel.has(`${kontrak.id_rombel}-${key}`)) { bebas = false; break; }
            }
            if (!bebas) continue;
            if (!gen.butuhRuangan) { best = mulai; bestRuangan = null; break; }
            // ruangan: coba ruangan lama dulu, lalu kandidat lain yang kosong
            const coba = [gen.id_ruangan, ...(kandidatMap[gen.id_kontrak] || [])];
            for (const rid of coba) {
              if (!rid) continue;
              let ok = true;
              for (let s = mulai; s < mulai + gen.durasi; s++) {
                const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
                if ((ruangOcc.get(`${rid}-${key}`) || 0) > 0 || fx.ruang.has(`${rid}-${key}`)) { ok = false; break; }
              }
              if (ok) { best = mulai; bestRuangan = rid; break cariGeser; }
            }
          }
          if (best !== gen.slot_mulai) bergerak = true;
          kromosom[gi] = { ...gen, slot_mulai: best, id_ruangan: gen.butuhRuangan ? bestRuangan : null };
          pasangCells(kromosom[gi], kontrak, 1);
        }
        cursor = kromosom[gi].slot_mulai + kromosom[gi].durasi;
      }
    }
    if (!bergerak) break; // sudah rapat
  }
  return kromosom;
}

/**
 * DEFRAG LINTAS-HARI: isi lubang internal di hari sebuah rombel dengan blok
 * EKOR (paling akhir) dari hari lain rombel yang sama — tanpa menciptakan
 * bentrok atau lubang baru. Melengkapi kompaksiKiri yang hanya menggeser
 * dalam satu hari (mentok bila guru sibuk di jam awal).
 */
function defragLubang(kromosom, kontrakMap, kandidatMap, cfg, fixedOcc) {
  const fx = fixedOcc || { guru: new Set(), rombel: new Set(), ruang: new Set() };
  const add = (map, k, d) => {
    const v = (map.get(k) || 0) + d;
    if (v <= 0) map.delete(k); else map.set(k, v);
  };
  const guruOcc = new Map(), rombelOcc = new Map(), ruangOcc = new Map();
  const kontrakHariCnt = new Map();
  const pasangG = (gen, kontrak, d) => {
    if (gen.butuhRuangan) add(kontrakHariCnt, `${gen.id_kontrak}-${gen.hari}`, d);
    for (let s = gen.slot_mulai; s < gen.slot_mulai + gen.durasi; s++) {
      const key = `${gen.hari}-${gen.waktu_shift}-${s}`;
      add(guruOcc, `${kontrak.id_guru}-${key}`, d);
      add(rombelOcc, `${kontrak.id_rombel}-${key}`, d);
      if (gen.id_ruangan) add(ruangOcc, `${gen.id_ruangan}-${key}`, d);
    }
  };
  kromosom.forEach(gen => {
    const k = kontrakMap[gen.id_kontrak];
    if (k) pasangG(gen, k, 1);
  });

  for (let langkah = 0; langkah < 300; langkah++) {
    // Susun blok per (rombel, hari, sesi)
    const byDay = new Map();
    kromosom.forEach((gen, gi) => {
      const k = kontrakMap[gen.id_kontrak];
      if (!k) return;
      const key = `${k.id_rombel}|${gen.hari}|${gen.waktu_shift}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(gi);
    });
    for (const idxs of byDay.values()) idxs.sort((a, b) => kromosom[a].slot_mulai - kromosom[b].slot_mulai);

    let pindah = false;
    cariLubang:
    for (const [key, idxs] of byDay) {
      const [idRombel, hari, shift] = key.split('|');
      // Temukan lubang internal pertama di hari ini
      let prevEnd = null;
      for (const gi of idxs) {
        const g = kromosom[gi];
        if (prevEnd != null && g.slot_mulai > prevEnd + 1) {
          const hole = { start: prevEnd + 1, len: g.slot_mulai - prevEnd - 1 };
          // Kandidat pengisi: blok EKOR dari hari lain rombel yang sama
          for (const [key2, idxs2] of byDay) {
            if (key2 === key) continue;
            if (!key2.startsWith(`${idRombel}|`)) continue;
            const tailGi = idxs2[idxs2.length - 1];
            const tg = kromosom[tailGi];
            if (tg.olahraga) continue; // olahraga tetap di jam awal — jangan dipindah ke lubang
            if (tg.durasi > hole.len) continue;
            const kontrak = kontrakMap[tg.id_kontrak];
            if (tg.butuhRuangan && (kontrakHariCnt.get(`${tg.id_kontrak}-${hari}`) || 0) > 0) continue; // beda-hari
            pasangG(tg, kontrak, -1);
            // cek guru & (bila perlu) ruangan bebas di sel lubang
            let bebas = true;
            for (let s = hole.start; s < hole.start + tg.durasi; s++) {
              const cKey = `${hari}-${shift}-${s}`;
              if ((guruOcc.get(`${kontrak.id_guru}-${cKey}`) || 0) > 0 || fx.guru.has(`${kontrak.id_guru}-${cKey}`)
                || (rombelOcc.get(`${kontrak.id_rombel}-${cKey}`) || 0) > 0 || fx.rombel.has(`${kontrak.id_rombel}-${cKey}`)) { bebas = false; break; }
            }
            let ruanganBaru = null;
            if (bebas && tg.butuhRuangan) {
              bebas = false;
              for (const rid of [tg.id_ruangan, ...(kandidatMap[tg.id_kontrak] || [])]) {
                if (!rid) continue;
                let ok = true;
                for (let s = hole.start; s < hole.start + tg.durasi; s++) {
                  const cKey = `${hari}-${shift}-${s}`;
                  if ((ruangOcc.get(`${rid}-${cKey}`) || 0) > 0 || fx.ruang.has(`${rid}-${cKey}`)) { ok = false; break; }
                }
                if (ok) { ruanganBaru = rid; bebas = true; break; }
              }
            }
            if (bebas) {
              kromosom[tailGi] = { ...tg, hari, waktu_shift: shift, slot_mulai: hole.start, id_ruangan: tg.butuhRuangan ? ruanganBaru : null };
              pasangG(kromosom[tailGi], kontrak, 1);
              pindah = true;
              break cariLubang; // struktur berubah — susun ulang
            }
            pasangG(tg, kontrak, 1); // batal
          }
        }
        prevEnd = Math.max(prevEnd == null ? 0 : prevEnd, g.slot_mulai + g.durasi - 1);
      }
    }
    if (!pindah) break;
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

function mutasi(kromosom, kandidatMap, cfg, hariShiftMap) {
  return kromosom.map(gen => {
    if (Math.random() >= PROB_MUTASI) return gen;

    const baru = { ...gen };
    const pairs = hariShiftMap[gen.id_kontrak];
    // Pindah ke pasangan (hari, sesi) lain yang diizinkan rombel; sesi ikut hari terpilih.
    if (!gen.butuhRuangan) {
      Object.assign(baru, randomSlotBlok(gen.durasi, cfg, pairs));
      if (gen.olahraga) baru.slot_mulai = 1; // olahraga selalu didorong ke jam awal
      return baru;
    }
    const kandidat = kandidatMap[gen.id_kontrak];
    const ubahRuangan = Math.random() < 0.5;
    if (ubahRuangan) baru.id_ruangan = pick(kandidat);
    if (!ubahRuangan || Math.random() < 0.5) Object.assign(baru, randomSlotBlok(gen.durasi, cfg, pairs));
    return baru;
  });
}

async function jalankan(onProgress, opts = {}) {
  const reset = opts.mode !== 'incremental'; // default: generate ulang penuh
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

  // Konfigurasi waktu sesuai mode kurikulum + kapasitas hari khusus (upacara/sholat jumat)
  const setting = await Setting.findByPk(1);
  const mode = setting?.mode_kurikulum === 'satu_sesi' ? 'satu_sesi' : 'dua_sesi';
  const KHUSUS = {};
  const jadwalKhusus = setting?.jadwal_khusus || {};
  Object.entries(jadwalKhusus).forEach(([key, p]) => {
    if (p?.aktif && p.max_jp > 0) KHUSUS[key] = p.max_jp;
  });
  const cfg = { ...MODE_CONFIG[mode], KHUSUS, TOTAL_RUANG: ruanganList.length };

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

  // Peta semua kontrak + kandidat ruangan + pasangan (hari,sesi) valid per kontrak
  const kontrakMap = {};
  const kandidatMap = {};
  const hariShiftMap = {};
  kontrakList.forEach(k => {
    const kj = k.toJSON();
    kontrakMap[kj.id_kontrak] = kj;
    kandidatMap[kj.id_kontrak] = hitungKandidatRuangan(kj, indeksRuangan);
    hariShiftMap[kj.id_kontrak] = rombelSesiHari(kj.Rombel, cfg);
  });

  // Mode INCREMENTAL: muat jadwal lama sebagai okupansi tetap; hanya jadwalkan
  // kontrak yang BELUM punya baris jadwal.
  const jadwalLama = reset ? [] : await JadwalOptimal.findAll();
  const sudahTerjadwal = new Set();
  const fixedOcc = { guru: new Set(), rombel: new Set(), ruang: new Set(), rombelShift: {} };
  jadwalLama.forEach(row => {
    sudahTerjadwal.add(row.id_kontrak);
    const kj = kontrakMap[row.id_kontrak];
    const key = `${row.hari}-${row.waktu_shift}-${row.slot_jam}`;
    if (kj) fixedOcc.guru.add(`${kj.id_guru}-${key}`);
    fixedOcc.rombel.add(`${row.id_rombel}-${key}`);
    if (row.id_ruangan) fixedOcc.ruang.add(`${row.id_ruangan}-${key}`);
    // Sesi yang sudah dipakai rombel di hari itu (aturan satu-hari-satu-sesi)
    const rsKey = `${row.id_rombel}-${row.hari}`;
    (fixedOcc.rombelShift[rsKey] = fixedOcc.rombelShift[rsKey] || new Set()).add(row.waktu_shift);
  });

  // Bagi JP menjadi blok harian; sesi (waktu_shift) ditentukan oleh rombel.
  const unitList = [];
  let totalJpDiluar = 0;
  let totalKontrakPkl = 0;

  kontrakList.forEach(k => {
    const kj = kontrakMap[k.id_kontrak];
    if (!reset && sudahTerjadwal.has(kj.id_kontrak)) return; // sudah ada di jadwal

    const blokMaks = Math.min(MAKS_JP_PER_HARI, kj.max_jam_harian || MAKS_JP_PER_HARI, cfg.SLOT_PER_SHIFT);
    const push = (blok, butuhRuangan, olahraga = false) => unitList.push({ id_kontrak: kj.id_kontrak, blok, butuhRuangan, olahraga });
    const totalJp = kj.jumlah_jp || 0;

    // PKL: seluruh JP tanpa ruangan (belajar di luar sekolah)
    if (kj.is_pkl || kj.Rombel?.is_pkl) {
      if (totalJp <= 0) return;
      totalKontrakPkl++;
      push(partisiBlok(totalJp, blokMaks), false);
      return;
    }

    const alokasi = kj.MataPelajaran?.alokasi_per_minggu || 0;
    const jpDiluar = kj.MataPelajaran?.jp_diluar || 0;

    // Mapel SEPENUHNYA di luar kelas (mis. PJOK di lapangan): TETAP masuk kalender
    // sebagai blok TANPA ruangan sebanyak alokasinya. ATURAN OLAHRAGA:
    //   - SATU blok utuh (JP tidak dipecah ke beberapa hari),
    //   - ditempatkan di JAM AWAL sesi (soft penalty bila mundur),
    //   - BOLEH beda sesi dari pelajaran lain rombel di hari yang sama
    //     (pagi belajar -> siang olahraga, atau sebaliknya).
    if (jpDiluar > 0 && alokasi - jpDiluar <= 0) {
      const jpLapangan = alokasi > 0 ? alokasi : totalJp;
      if (jpLapangan <= 0) return;
      totalJpDiluar += jpLapangan;
      const blokOlahraga = jpLapangan <= cfg.SLOT_PER_SHIFT ? [jpLapangan] : partisiBlok(jpLapangan, blokMaks);
      push(blokOlahraga, false, true);
      return;
    }

    // Mapel normal: hanya JP di sekolah (jumlah_jp) yang dijadwalkan & memakai ruangan.
    // JP diluar (sebagian) tidak masuk kalender.
    if (totalJp <= 0) return;
    totalJpDiluar += jpDiluar;
    push(partisiBlok(totalJp, blokMaks), true);
  });

  // Incremental & tidak ada kontrak baru → tidak melakukan apa-apa.
  if (unitList.length === 0) {
    if (!reset) return { fitness: 0, totalJadwal: jadwalLama.length, ditambahkan: 0, pelanggaranHard: 0, jpDiluar: 0, kontrakPkl: 0, mode: 'incremental' };
    throw new Error('Tidak ada JP yang perlu dijadwalkan');
  }

  // Urutan blok kanonik (gen ke-i identik di semua kromosom → crossover valid)
  const blokList = [];
  unitList.forEach(u => {
    u.blok.forEach(durasi => {
      blokList.push({ idx: blokList.length, id_kontrak: u.id_kontrak, durasi, butuhRuangan: u.butuhRuangan, olahraga: u.olahraga || false });
    });
  });

  // Populasi campuran: mayoritas greedy (sadar-bentrok, tetap beragam karena diacak),
  // sisanya acak murni untuk menjaga eksplorasi.
  const JUMLAH_GREEDY = Math.floor(POPULASI_SIZE * 0.6);
  let populasi = Array.from({ length: POPULASI_SIZE }, (_, i) =>
    i < JUMLAH_GREEDY
      ? greedyKromosom(blokList, kandidatMap, kontrakMap, cfg, fixedOcc, hariShiftMap)
      : inisialisasiKromosom(blokList, kandidatMap, cfg, hariShiftMap)
  );

  let bestKromosom = null;
  let bestFitness = -Infinity;
  let stagnan = 0;

  for (let gen = 0; gen < MAX_GENERASI; gen++) {
    const fitnessArr = populasi.map(k => hitungFitness(k, kontrakMap, ruanganMap, cfg, fixedOcc));

    let membaik = false;
    fitnessArr.forEach((f, i) => {
      if (f > bestFitness) {
        bestFitness = f;
        bestKromosom = populasi[i];
        membaik = true;
      }
    });
    stagnan = membaik ? 0 : stagnan + 1;

    // MEMETIC: tiap beberapa generasi, kromosom terbaik diperbaiki secara lokal
    // (relokasi blok bentrok ke slot kosong) lalu diinjeksi kembali ke populasi.
    // GA menjelajah global, perbaikan lokal menuntaskan detail — jauh lebih cepat
    // menuju 0 bentrok daripada menunggu mutasi acak.
    if (gen % 10 === 9 && bestKromosom) {
      const diperbaiki = perbaikanLokal([...bestKromosom], kontrakMap, kandidatMap, cfg, fixedOcc, hariShiftMap, 3);
      const f = hitungFitness(diperbaiki, kontrakMap, ruanganMap, cfg, fixedOcc);
      if (f > bestFitness) {
        bestFitness = f;
        bestKromosom = diperbaiki;
        stagnan = 0;
      }
      populasi[randomInt(POPULASI_SIZE)] = diperbaiki; // injeksi (gantikan satu anggota acak)
    }

    if (onProgress) onProgress({ generasi: gen + 1, fitness: bestFitness });
    // Give the event loop a chance to process other requests (e.g. status polling)
    // so the server doesn't appear to freeze on the client while GA runs.
    if (gen % 3 === 0) await new Promise(resolve => setImmediate(resolve));

    // Early stop: sudah konvergen (tidak membaik N generasi). Solusi terbaik bisa
    // bernilai negatif kecil karena penalti lunak ruangan (produktif di teori).
    if (stagnan >= STAGNAN_MAX) break;

    // Elitism
    const urutan = fitnessArr.map((f, i) => [f, i]).sort((a, b) => b[0] - a[0]);
    const generasiBaru = [];
    for (let e = 0; e < ELITISM && e < urutan.length; e++) {
      generasiBaru.push(populasi[urutan[e][1]]);
    }

    while (generasiBaru.length < POPULASI_SIZE) {
      const p1 = seleksiTournament(populasi, fitnessArr);
      const p2 = seleksiTournament(populasi, fitnessArr);
      const anak = mutasi(crossover(p1, p2), kandidatMap, cfg, hariShiftMap);
      generasiBaru.push(anak);
    }
    populasi = generasiBaru;
  }

  // PERBAIKAN LOKAL final: sapu sisa bentrok — relokasi, ejeksi, sampai pecah blok.
  // Diulang beberapa percobaan (urutan acak berbeda) sampai benar-benar 0.
  for (let coba = 0; coba < 5; coba++) {
    bestKromosom = perbaikanLokal([...bestKromosom], kontrakMap, kandidatMap, cfg, fixedOcc, hariShiftMap, 20, true);
    if (hitungHardConstraint(bestKromosom, kontrakMap, ruanganMap, cfg, fixedOcc) === 0) break;
  }
  // KOMPAKSI & DEFRAG: rapatkan blok ke awal hari, isi lubang internal dengan
  // blok ekor dari hari lain, lalu rapatkan lagi — tanpa menciptakan bentrok baru.
  bestKromosom = kompaksiKiri(bestKromosom, kontrakMap, kandidatMap, cfg, fixedOcc);
  bestKromosom = defragLubang(bestKromosom, kontrakMap, kandidatMap, cfg, fixedOcc);
  bestKromosom = kompaksiKiri(bestKromosom, kontrakMap, kandidatMap, cfg, fixedOcc);
  bestFitness = hitungFitness(bestKromosom, kontrakMap, ruanganMap, cfg, fixedOcc);

  const penaltiAkhir = hitungHardConstraint(bestKromosom, kontrakMap, ruanganMap, cfg, fixedOcc);
  const pelanggaranHard = Math.round(penaltiAkhir / PENALTI);
  const rincianPelanggaran = auditPelanggaran(bestKromosom, kontrakMap, cfg, fixedOcc);
  // Berapa JP produktif yang terpaksa ditaruh di ruang Teori (lab penuh)
  let produktifDiTeori = 0;
  // Kepuasan preferensi hari guru: % JP yang jatuh di hari bernilai >= 3
  // (hanya kontrak yang punya preferensi terisi)
  let prefJpTotal = 0, prefJpPuas = 0;
  for (const gen of bestKromosom) {
    const kj = kontrakMap[gen.id_kontrak];
    if (gen.id_ruangan && KATEGORI_PRAKTIK.includes(kj?.MataPelajaran?.kategori_mapel)
      && ruanganMap[gen.id_ruangan]?.jenis_ruangan === 'Teori') produktifDiTeori += gen.durasi;
    const pref = prefHariKontrak(kj);
    if (Object.keys(pref).length) {
      prefJpTotal += gen.durasi;
      if ((pref[gen.hari] != null ? pref[gen.hari] : 3) >= 3) prefJpPuas += gen.durasi;
    }
  }
  const kepuasanPreferensi = prefJpTotal > 0 ? Math.round((prefJpPuas / prefJpTotal) * 100) : null;

  // Simpan: tiap blok di-expand menjadi baris per-JP berurutan (skema DB tetap)
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

  // Mode full: hapus semua lalu simpan. Mode incremental: tambahkan ke jadwal lama.
  if (reset) await JadwalOptimal.destroy({ where: {} });
  await JadwalOptimal.bulkCreate(rows);

  return {
    fitness: bestFitness,
    totalJadwal: (reset ? 0 : jadwalLama.length) + rows.length,
    ditambahkan: rows.length,
    pelanggaranHard,
    rincianPelanggaran,
    kepuasanPreferensi,
    jpDiluar: totalJpDiluar,
    kontrakPkl: totalKontrakPkl,
    produktifDiTeori,
    mode: reset ? 'full' : 'incremental',
  };
}

module.exports = { jalankan, MODE_CONFIG };
