const { JadwalOptimal, KontrakMengajar, Guru, MataPelajaran, Rombel, Ruangan, Setting } = require('../models');
const genetikaService = require('../services/genetikaService');

// Status GA global (per proses)
let gaStatus = { running: false, generasi: 0, fitness: null, selesai: false, error: null };

async function generate(req, res) {
  if (gaStatus.running) {
    return res.status(409).json({ message: 'Algoritma Genetika sedang berjalan' });
  }

  // mode: 'incremental' (hanya kontrak baru, pertahankan jadwal lama) | 'full' (ulang penuh)
  const mode = req.body?.mode === 'incremental' ? 'incremental' : 'full';
  gaStatus = { running: true, generasi: 0, fitness: null, selesai: false, error: null, modeGenerate: mode };

  // Jalankan GA di background
  genetikaService.jalankan((progress) => {
    gaStatus.generasi = progress.generasi;
    gaStatus.fitness = progress.fitness;
  }, { mode }).then(result => {
    gaStatus = { running: false, generasi: gaStatus.generasi, fitness: result.fitness, selesai: true, error: null, totalJadwal: result.totalJadwal, ditambahkan: result.ditambahkan, pelanggaranHard: result.pelanggaranHard, rincianPelanggaran: result.rincianPelanggaran, kepuasanPreferensi: result.kepuasanPreferensi, jpDiluar: result.jpDiluar, kontrakPkl: result.kontrakPkl, produktifDiTeori: result.produktifDiTeori, modeGenerate: result.mode };
  }).catch(err => {
    gaStatus = { running: false, generasi: gaStatus.generasi, fitness: null, selesai: false, error: err.message };
  });

  res.json({ message: 'Algoritma Genetika dimulai', status: gaStatus });
}

async function status(req, res) {
  res.json(gaStatus);
}

async function index(req, res) {
  const { id_rombel, waktu_shift } = req.query;

  // Ambil SEMUA jadwal dulu agar deteksi bentrok akurat (filter diterapkan setelahnya)
  const data = await JadwalOptimal.findAll({
    include: [
      { model: Rombel },
      { model: Ruangan },
      {
        model: KontrakMengajar,
        include: [Guru, MataPelajaran],
      },
    ],
    order: [['hari', 'ASC'], ['slot_jam', 'ASC']],
  });

  // Deteksi bentrok: guru / rombel / ruangan yang menempati slot waktu sama
  const byGuru = {};
  const byRombel = {};
  const byRuangan = {};
  data.forEach(j => {
    const key = `${j.hari}-${j.waktu_shift}-${j.slot_jam}`;
    const idGuru = j.KontrakMengajar?.id_guru;
    if (idGuru) (byGuru[`${idGuru}-${key}`] = byGuru[`${idGuru}-${key}`] || []).push(j.id_jadwal);
    if (j.id_rombel) (byRombel[`${j.id_rombel}-${key}`] = byRombel[`${j.id_rombel}-${key}`] || []).push(j.id_jadwal);
    if (j.id_ruangan) (byRuangan[`${j.id_ruangan}-${key}`] = byRuangan[`${j.id_ruangan}-${key}`] || []).push(j.id_jadwal);
  });
  const bentrokMap = {};
  const tandai = (grup, label) => {
    Object.values(grup).forEach(ids => {
      if (ids.length < 2) return;
      ids.forEach(id => {
        bentrokMap[id] = bentrokMap[id] || [];
        if (!bentrokMap[id].includes(label)) bentrokMap[id].push(label);
      });
    });
  };
  tandai(byGuru, 'guru');
  tandai(byRombel, 'rombel');
  // tandai(byRuangan, 'ruangan'); // DINONAKTIFKAN: bentrok ruangan tidak ditampilkan

  let hasil = data.map(j => ({ ...j.toJSON(), bentrok: bentrokMap[j.id_jadwal] || [] }));
  if (id_rombel) hasil = hasil.filter(j => j.id_rombel === id_rombel);
  if (waktu_shift) hasil = hasil.filter(j => j.waktu_shift === waktu_shift);

  res.json(hasil);
}

async function insight(req, res) {
  const jadwal = await JadwalOptimal.findAll({
    include: [{
      model: KontrakMengajar,
      include: [Guru, MataPelajaran],
    }],
  });

  const stats = { PNS: { total: 0, sesuai: 0 }, P3K: { total: 0, sesuai: 0 }, Honorer: { total: 0, sesuai: 0 } };
  const perGuru = {};

  jadwal.forEach(j => {
    const kontrak = j.KontrakMengajar;
    if (!kontrak?.Guru) return;

    const status = kontrak.Guru.status_kepegawaian;
    const preferensi = kontrak.preferensi_hari || {};
    const nilaiHari = preferensi[j.hari] || 1;
    const sesuai = nilaiHari >= 3;

    stats[status].total++;
    if (sesuai) stats[status].sesuai++;

    const idGuru = kontrak.id_guru;
    if (!perGuru[idGuru]) {
      perGuru[idGuru] = {
        id_guru: idGuru,
        nama_guru: kontrak.Guru.nama_guru,
        status_kepegawaian: status,
        jadwal: [],
      };
    }
    perGuru[idGuru].jadwal.push({
      hari: j.hari,
      slot_jam: j.slot_jam,
      waktu_shift: j.waktu_shift,
      bobot_preferensi: nilaiHari,
    });
  });

  const kepuasan = {};
  Object.entries(stats).forEach(([kasta, s]) => {
    kepuasan[kasta] = s.total > 0 ? Math.round((s.sesuai / s.total) * 100) : 0;
  });

  res.json({ kepuasan, perGuru: Object.values(perGuru), stats });
}

// Peta penggunaan ruangan untuk dashboard — dimensi mengikuti mode kurikulum
async function ruanganMap(req, res) {
  const { Setting } = require('../models');
  const setting = await Setting.findByPk(1);
  const mode = setting?.mode_kurikulum === 'satu_sesi' ? 'satu_sesi' : 'dua_sesi';
  // Satu sumber konfigurasi dengan algoritma (genetikaService.MODE_CONFIG)
  const cfg = genetikaService.MODE_CONFIG[mode];
  const HARI = cfg.HARI;
  const SHIFT = cfg.WAKTU_SHIFT;
  const SLOT_PER_SHIFT = cfg.SLOT_PER_SHIFT;
  // Kapasitas total = jumlah hari × (jumlah slot tiap sesi) — Pagi 8 + Siang 6 = 14/hari
  const jpPerHari = SHIFT.reduce((s, sh) => s + ((cfg.SLOT && cfg.SLOT[sh] != null) ? cfg.SLOT[sh] : SLOT_PER_SHIFT), 0);
  const kapasitas = HARI.length * jpPerHari;

  const ruangan = await Ruangan.findAll({ order: [['jenis_ruangan', 'ASC'], ['id_ruangan', 'ASC']] });
  const jadwal = await JadwalOptimal.findAll({
    include: [
      { model: KontrakMengajar, include: [MataPelajaran, Guru] },
      { model: Rombel },
    ],
  });

  const byRoom = {};
  jadwal.forEach(j => {
    (byRoom[j.id_ruangan] = byRoom[j.id_ruangan] || []).push({
      hari: j.hari,
      slot_jam: j.slot_jam,
      waktu_shift: j.waktu_shift,
      mapel: j.KontrakMengajar?.MataPelajaran?.nama_mapel || null,
      guru: j.KontrakMengajar?.Guru?.nama_guru || null,
      rombel: j.Rombel?.nama_rombel || j.id_rombel,
    });
  });

  const data = ruangan.map(r => {
    const pakai = byRoom[r.id_ruangan] || [];
    return {
      id_ruangan: r.id_ruangan,
      nama_ruangan: r.nama_ruangan,
      jenis_ruangan: r.jenis_ruangan,
      id_jurusan: r.id_jurusan || null,
      terpakai: pakai.length,
      kapasitas,
      detail: pakai,
    };
  });

  res.json({ kapasitas, mode, hari: HARI, shift: SHIFT, slotPerShift: SLOT_PER_SHIFT, ruangan: data });
}

// Edit manual: pindahkan satu sel jadwal (drag & drop) — perubahan langsung tersimpan.
async function pindah(req, res) {
  const { hari, slot_jam, waktu_shift, id_ruangan } = req.body;
  const jadwal = await JadwalOptimal.findByPk(req.params.id);
  if (!jadwal) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });

  const patch = {};
  if (hari !== undefined) patch.hari = hari;
  if (slot_jam !== undefined) patch.slot_jam = slot_jam;
  if (waktu_shift !== undefined) patch.waktu_shift = waktu_shift;
  if (id_ruangan !== undefined) patch.id_ruangan = id_ruangan || null;

  await jadwal.update(patch);
  res.json(jadwal);
}

// Edit manual: pindahkan beberapa sel sekaligus (satu blok) dalam satu permintaan.
async function pindahBlok(req, res) {
  const { updates } = req.body;
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: 'updates wajib berupa array' });
  }
  let updated = 0;
  for (const u of updates) {
    const row = await JadwalOptimal.findByPk(u.id_jadwal);
    if (!row) continue;
    const patch = {};
    if (u.hari !== undefined) patch.hari = u.hari;
    if (u.slot_jam !== undefined) patch.slot_jam = u.slot_jam;
    if (u.waktu_shift !== undefined) patch.waktu_shift = u.waktu_shift;
    if (u.id_ruangan !== undefined) patch.id_ruangan = u.id_ruangan || null;
    await row.update(patch);
    updated++;
  }
  res.json({ updated });
}

// Edit manual: hapus satu sel jadwal.
async function hapusSel(req, res) {
  const jadwal = await JadwalOptimal.findByPk(req.params.id);
  if (!jadwal) return res.status(404).json({ message: 'Jadwal tidak ditemukan' });
  await jadwal.destroy();
  res.json({ message: 'Sel jadwal dihapus' });
}

module.exports = { generate, status, index, insight, ruanganMap, pindah, pindahBlok, hapusSel };
