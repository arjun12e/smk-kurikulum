const { JadwalOptimal, KontrakMengajar, Guru, MataPelajaran, Rombel, Ruangan } = require('../models');
const genetikaService = require('../services/genetikaService');

// Status GA global (per proses)
let gaStatus = { running: false, generasi: 0, fitness: null, selesai: false, error: null };

async function generate(req, res) {
  if (gaStatus.running) {
    return res.status(409).json({ message: 'Algoritma Genetika sedang berjalan' });
  }

  gaStatus = { running: true, generasi: 0, fitness: null, selesai: false, error: null };

  // Jalankan GA di background
  genetikaService.jalankan((progress) => {
    gaStatus.generasi = progress.generasi;
    gaStatus.fitness = progress.fitness;
  }).then(result => {
    gaStatus = { running: false, generasi: gaStatus.generasi, fitness: result.fitness, selesai: true, error: null, totalJadwal: result.totalJadwal };
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
  const where = {};
  if (id_rombel) where.id_rombel = id_rombel;
  if (waktu_shift) where.waktu_shift = waktu_shift;

  const data = await JadwalOptimal.findAll({
    where,
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

  res.json(data);
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

module.exports = { generate, status, index, insight };
