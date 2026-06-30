const { Jurusan } = require('../models');
const { Op } = require('sequelize');

async function index(req, res) {
  const { search } = req.query;
  const where = {};
  if (search) where.nama_jurusan = { [Op.like]: `%${search}%` };

  const data = await Jurusan.findAll({ where, order: [['id_jurusan', 'ASC']] });
  res.json(data);
}

async function show(req, res) {
  const jurusan = await Jurusan.findByPk(req.params.id);
  if (!jurusan) return res.status(404).json({ message: 'Jurusan tidak ditemukan' });
  res.json(jurusan);
}

async function store(req, res) {
  const { id_jurusan, nama_jurusan } = req.body;
  if (!id_jurusan || !nama_jurusan) {
    return res.status(400).json({ message: 'ID dan nama jurusan wajib diisi' });
  }

  const exists = await Jurusan.findByPk(id_jurusan);
  if (exists) return res.status(422).json({ message: 'ID Jurusan sudah digunakan' });

  const jurusan = await Jurusan.create({ id_jurusan, nama_jurusan });
  res.status(201).json(jurusan);
}

async function update(req, res) {
  const jurusan = await Jurusan.findByPk(req.params.id);
  if (!jurusan) return res.status(404).json({ message: 'Jurusan tidak ditemukan' });

  const { nama_jurusan } = req.body;
  await jurusan.update({ nama_jurusan });
  res.json(jurusan);
}

async function destroy(req, res) {
  const jurusan = await Jurusan.findByPk(req.params.id);
  if (!jurusan) return res.status(404).json({ message: 'Jurusan tidak ditemukan' });
  await jurusan.destroy();
  res.json({ message: 'Jurusan berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
