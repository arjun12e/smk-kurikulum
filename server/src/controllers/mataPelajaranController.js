const { MataPelajaran } = require('../models');
const { Op } = require('sequelize');

async function index(req, res) {
  const { search, kategori } = req.query;
  const where = {};
  if (search) where.nama_mapel = { [Op.like]: `%${search}%` };
  if (kategori) where.kategori_mapel = kategori;

  const data = await MataPelajaran.findAll({ where, order: [['kategori_mapel', 'ASC']] });
  res.json(data);
}

async function show(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
  res.json(mapel);
}

async function store(req, res) {
  const { id_mapel, nama_mapel, kategori_mapel, alokasi_per_minggu, jp_diluar } = req.body;
  if (!id_mapel || !nama_mapel || !kategori_mapel) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  const exists = await MataPelajaran.findByPk(id_mapel);
  if (exists) return res.status(422).json({ message: 'ID Mapel sudah digunakan' });

  const mapel = await MataPelajaran.create({ id_mapel, nama_mapel, kategori_mapel, alokasi_per_minggu: alokasi_per_minggu || 0, jp_diluar: jp_diluar || 0 });
  res.status(201).json(mapel);
}

async function update(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });

  const { nama_mapel, kategori_mapel, alokasi_per_minggu, jp_diluar } = req.body;
  await mapel.update({ nama_mapel, kategori_mapel, alokasi_per_minggu, jp_diluar });
  res.json(mapel);
}

async function destroy(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
  await mapel.destroy();
  res.json({ message: 'Mata pelajaran berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
