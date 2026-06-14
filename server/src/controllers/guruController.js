const { Guru, KontrakMengajar } = require('../models');
const { Op } = require('sequelize');

async function index(req, res) {
  const { search, status } = req.query;
  const where = {};
  if (search) where.nama_guru = { [Op.like]: `%${search}%` };
  if (status) where.status_kepegawaian = status;

  const data = await Guru.findAll({ where, order: [['id_guru', 'ASC']] });
  res.json(data);
}

async function show(req, res) {
  const guru = await Guru.findByPk(req.params.id);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });
  res.json(guru);
}

async function store(req, res) {
  const { nama_guru, status_kepegawaian, jenis_guru, total_jam_mengajar } = req.body;
  if (!nama_guru || !status_kepegawaian || !jenis_guru) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  
  const allData = await Guru.findAll({ attributes: ['id_guru'] });
  let max = 0;
  allData.forEach(item => {
    const num = parseInt(item.id_guru.replace(/\D/g, ''), 10);
    if (num > max) max = num;
  });
  const id_guru = `G${String(max + 1).padStart(3, '0')}`;

  const guru = await Guru.create({ id_guru, nama_guru, status_kepegawaian, jenis_guru, total_jam_mengajar: total_jam_mengajar || 0 });
  res.status(201).json(guru);
}

async function update(req, res) {
  const guru = await Guru.findByPk(req.params.id);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });

  const { nama_guru, status_kepegawaian, jenis_guru, total_jam_mengajar } = req.body;
  await guru.update({ nama_guru, status_kepegawaian, jenis_guru, total_jam_mengajar });
  res.json(guru);
}

async function destroy(req, res) {
  const guru = await Guru.findByPk(req.params.id);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });
  await guru.destroy();
  res.json({ message: 'Guru berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
