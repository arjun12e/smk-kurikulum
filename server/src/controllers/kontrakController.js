const { KontrakMengajar, Guru, MataPelajaran, Rombel, sequelize } = require('../models');
const { Op } = require('sequelize');

const BOBOT_KASTA = { PNS: 3, GTY: 2, GTT: 1 };

async function index(req, res) {
  const { id_guru, id_rombel, status_kepegawaian } = req.query;
  const where = {};
  if (id_guru) where.id_guru = id_guru;
  if (id_rombel) where.id_rombel = id_rombel;

  const guruWhere = {};
  if (status_kepegawaian) guruWhere.status_kepegawaian = status_kepegawaian;

  const data = await KontrakMengajar.findAll({
    where,
    include: [
      { model: Guru, where: Object.keys(guruWhere).length ? guruWhere : undefined },
      { model: MataPelajaran },
      { model: Rombel },
    ],
    order: [['id_guru', 'ASC']],
  });

  // Warning: guru dengan total JP > 24 per minggu
  const jpPerGuru = {};
  data.forEach(k => {
    jpPerGuru[k.id_guru] = (jpPerGuru[k.id_guru] || 0) + k.jumlah_jp;
  });
  const warnings = Object.entries(jpPerGuru)
    .filter(([, jp]) => jp > 24)
    .map(([id_guru, total_jp]) => ({ id_guru, total_jp }));

  res.json({ data, warnings });
}

async function show(req, res) {
  const kontrak = await KontrakMengajar.findByPk(req.params.id, {
    include: [Guru, MataPelajaran, Rombel],
  });
  if (!kontrak) return res.status(404).json({ message: 'Kontrak tidak ditemukan' });
  res.json(kontrak);
}

async function store(req, res) {
  const { id_guru, id_mapel, id_rombel, jumlah_jp, max_jam_harian, preferensi_hari } = req.body;

  if (!id_guru || !id_mapel || !id_rombel || !jumlah_jp) {
    return res.status(400).json({ message: 'Field id_guru, id_mapel, id_rombel, jumlah_jp wajib diisi' });
  }

  const duplikat = await KontrakMengajar.findOne({ where: { id_guru, id_mapel, id_rombel } });
  if (duplikat) return res.status(422).json({ message: 'Kontrak mengajar duplikat untuk kombinasi guru-mapel-rombel ini' });

  const kontrak = await KontrakMengajar.create({
    id_guru, id_mapel, id_rombel,
    jumlah_jp,
    max_jam_harian: max_jam_harian || 6,
    preferensi_hari: preferensi_hari || { Senin: 3, Selasa: 3, Rabu: 3, Kamis: 3, Jumat: 3, Sabtu: 3 },
  });
  res.status(201).json(kontrak);
}

async function update(req, res) {
  const kontrak = await KontrakMengajar.findByPk(req.params.id);
  if (!kontrak) return res.status(404).json({ message: 'Kontrak tidak ditemukan' });

  const { jumlah_jp, max_jam_harian, preferensi_hari, id_mapel, id_rombel, id_guru } = req.body;
  await kontrak.update({ jumlah_jp, max_jam_harian, preferensi_hari, id_mapel, id_rombel, id_guru });
  res.json(kontrak);
}

async function destroy(req, res) {
  const kontrak = await KontrakMengajar.findByPk(req.params.id);
  if (!kontrak) return res.status(404).json({ message: 'Kontrak tidak ditemukan' });
  await kontrak.destroy();
  res.json({ message: 'Kontrak mengajar berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
