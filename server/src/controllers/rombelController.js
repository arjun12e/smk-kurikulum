const { Rombel, KontrakMengajar } = require('../models');
const { Op } = require('sequelize');

async function index(req, res) {
  const { tingkat } = req.query;
  const where = {};
  if (tingkat) where.tingkat = tingkat;

  const data = await Rombel.findAll({
    where,
    order: [['tingkat', 'ASC'], ['nama_rombel', 'ASC']],
    include: [{ model: KontrakMengajar, attributes: ['id_kontrak'] }],
  });

  res.json(data.map(r => ({
    ...r.toJSON(),
    jumlah_kontrak: r.KontrakMengajars?.length || 0,
  })));
}

async function show(req, res) {
  const rombel = await Rombel.findByPk(req.params.id);
  if (!rombel) return res.status(404).json({ message: 'Rombel tidak ditemukan' });
  res.json(rombel);
}

async function store(req, res) {
  const { id_rombel, nama_rombel, tingkat, jurusan } = req.body;
  if (!id_rombel || !nama_rombel || !tingkat || !jurusan) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  const exists = await Rombel.findByPk(id_rombel);
  if (exists) return res.status(422).json({ message: 'ID Rombel sudah digunakan' });

  const rombel = await Rombel.create({ id_rombel, nama_rombel, tingkat, jurusan });
  res.status(201).json(rombel);
}

async function update(req, res) {
  const rombel = await Rombel.findByPk(req.params.id);
  if (!rombel) return res.status(404).json({ message: 'Rombel tidak ditemukan' });

  const { nama_rombel, tingkat, jurusan } = req.body;
  await rombel.update({ nama_rombel, tingkat, jurusan });
  res.json(rombel);
}

async function destroy(req, res) {
  const rombel = await Rombel.findByPk(req.params.id);
  if (!rombel) return res.status(404).json({ message: 'Rombel tidak ditemukan' });
  await rombel.destroy();
  res.json({ message: 'Rombel berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
