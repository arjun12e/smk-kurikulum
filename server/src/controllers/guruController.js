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

// jenis_guru bisa string ('Umum') atau array (['Umum','Jurusan']) — keduanya valid.
function jenisKosong(jenis_guru) {
  if (Array.isArray(jenis_guru)) return jenis_guru.length === 0;
  return !jenis_guru;
}

async function store(req, res) {
  const { nama_guru, status_kepegawaian, jenis_guru, id_jurusan, total_jam_mengajar } = req.body;
  if (!nama_guru || !status_kepegawaian || jenisKosong(jenis_guru)) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  const allData = await Guru.findAll({ attributes: ['id_guru'] });
  let max = 0;
  allData.forEach(item => {
    const num = parseInt(item.id_guru.replace(/\D/g, ''), 10);
    if (num > max) max = num;
  });
  const id_guru = `G${String(max + 1).padStart(3, '0')}`;

  // Jurusan hanya disimpan jika guru bertipe Jurusan
  const isJurusan = Array.isArray(jenis_guru) ? jenis_guru.includes('Jurusan') : jenis_guru === 'Jurusan';
  const guru = await Guru.create({
    id_guru, nama_guru, status_kepegawaian, jenis_guru,
    id_jurusan: isJurusan ? (id_jurusan || null) : null,
    total_jam_mengajar: total_jam_mengajar || 0,
  });
  res.status(201).json(guru);
}

async function update(req, res) {
  const guru = await Guru.findByPk(req.params.id);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });

  const { nama_guru, status_kepegawaian, jenis_guru, id_jurusan, total_jam_mengajar } = req.body;
  const isJurusan = Array.isArray(jenis_guru) ? jenis_guru.includes('Jurusan') : jenis_guru === 'Jurusan';
  await guru.update({
    nama_guru, status_kepegawaian, jenis_guru,
    id_jurusan: isJurusan ? (id_jurusan || null) : null,
    total_jam_mengajar,
  });
  res.json(guru);
}

async function destroy(req, res) {
  const guru = await Guru.findByPk(req.params.id);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });
  await guru.destroy();
  res.json({ message: 'Guru berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
