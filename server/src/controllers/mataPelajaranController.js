const { MataPelajaran, Guru, Rombel } = require('../models');
const { Op } = require('sequelize');

async function index(req, res) {
  const { search, kategori, tingkat } = req.query;
  const where = {};
  if (search) where.nama_mapel = { [Op.like]: `%${search}%` };
  if (kategori) where.kategori_mapel = kategori;
  if (tingkat) where.tingkat = tingkat;

  const data = await MataPelajaran.findAll({ where, order: [['id_jurusan', 'DESC']] });
  res.json(data);
}

async function getByTingkat(req, res) {
  const { tingkat } = req.params;
  if (!['X', 'XI', 'XII'].includes(tingkat)) {
    return res.status(400).json({ message: 'Tingkat harus X, XI, atau XII' });
  }

  const data = await MataPelajaran.findAll({
    where: { 
      tingkat : {[Op.like]: `%${tingkat}%`},
    },
    order: [['kategori_mapel', 'ASC']],
  });
  res.json(data);
}

async function getByGuru(req, res) {
  const { id_guru } = req.params;
  const { tingkat } = req.query;

  const guru = await Guru.findByPk(id_guru);
  if (!guru) return res.status(404).json({ message: 'Guru tidak ditemukan' });

  let where = {};
  
  // Filter by guru's jenis_guru
  if (guru.jenis_guru && guru.jenis_guru.length > 0) {
    where[Op.or] = guru.jenis_guru.map(jenis => ({
      jenis_guru: {
        [Op.like]: `%${jenis}%`,
      },
    }));
  }

  // Also filter by tingkat if provided
  if (tingkat) {
    where.tingkat = tingkat;
  }

  const data = await MataPelajaran.findAll({
    where,
    order: [['kategori_mapel', 'ASC']],
  });
  res.json(data);
}

async function show(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
  res.json(mapel);
}

async function store(req, res) {
  const { id_mapel, nama_mapel, kategori_mapel, tingkat, jenis_guru, id_jurusan, alokasi_per_minggu, jp_diluar } = req.body;
  if (!id_mapel || !nama_mapel || !kategori_mapel) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  const exists = await MataPelajaran.findByPk(id_mapel);
  if (exists) return res.status(422).json({ message: 'ID Mapel sudah digunakan' });

  // Hanya mapel produktif yang terikat jurusan; lainnya NULL
  const jurusan = kategori_mapel === 'Produktif' ? (id_jurusan || null) : null;
  const mapel = await MataPelajaran.create({
    id_mapel,
    nama_mapel,
    kategori_mapel,
    tingkat: tingkat || null,
    jenis_guru: jenis_guru || null,
    id_jurusan: jurusan,
    alokasi_per_minggu: alokasi_per_minggu || 0,
    jp_diluar: jp_diluar || 0,
  });
  res.status(201).json(mapel);
}

async function update(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });

  const { nama_mapel, kategori_mapel, tingkat, jenis_guru, id_jurusan, alokasi_per_minggu, jp_diluar } = req.body;
  const jurusan = kategori_mapel === 'Produktif' ? (id_jurusan || null) : null;
  await mapel.update({ nama_mapel, kategori_mapel, tingkat, jenis_guru, id_jurusan: jurusan, alokasi_per_minggu, jp_diluar });
  res.json(mapel);
}

async function destroy(req, res) {
  const mapel = await MataPelajaran.findByPk(req.params.id);
  if (!mapel) return res.status(404).json({ message: 'Mata pelajaran tidak ditemukan' });
  await mapel.destroy();
  res.json({ message: 'Mata pelajaran berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy, getByTingkat, getByGuru };
