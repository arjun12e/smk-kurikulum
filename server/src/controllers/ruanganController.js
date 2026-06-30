const { Ruangan, JadwalOptimal } = require('../models');

async function index(req, res) {
  const { jenis } = req.query;
  const where = {};
  if (jenis) where.jenis_ruangan = jenis;

  const data = await Ruangan.findAll({
    where,
    order: [['id_ruangan', 'ASC']],
    include: [{ model: JadwalOptimal, attributes: ['id_jadwal'] }],
  });

  res.json(data.map(r => ({
    ...r.toJSON(),
    sedang_digunakan: (r.JadwalOptimals?.length || 0) > 0,
  })));
}

async function show(req, res) {
  const ruangan = await Ruangan.findByPk(req.params.id);
  if (!ruangan) return res.status(404).json({ message: 'Ruangan tidak ditemukan' });
  res.json(ruangan);
}

async function store(req, res) {
  const { id_ruangan, nama_ruangan, jenis_ruangan, id_jurusan, id_mapel_list } = req.body;
  if (!id_ruangan || !nama_ruangan || !jenis_ruangan) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }
  const exists = await Ruangan.findByPk(id_ruangan);
  if (exists) return res.status(422).json({ message: 'ID Ruangan sudah digunakan' });

  // Ruangan teori tidak terikat jurusan / daftar mapel
  const isTeori = jenis_ruangan === 'Teori';
  const ruangan = await Ruangan.create({
    id_ruangan, nama_ruangan, jenis_ruangan,
    id_jurusan: isTeori ? null : (id_jurusan || null),
    id_mapel_list: isTeori ? null : (id_mapel_list || null),
  });
  res.status(201).json(ruangan);
}

async function update(req, res) {
  const ruangan = await Ruangan.findByPk(req.params.id);
  if (!ruangan) return res.status(404).json({ message: 'Ruangan tidak ditemukan' });

  const { nama_ruangan, jenis_ruangan, id_jurusan, id_mapel_list } = req.body;
  const isTeori = jenis_ruangan === 'Teori';
  await ruangan.update({
    nama_ruangan, jenis_ruangan,
    id_jurusan: isTeori ? null : (id_jurusan || null),
    id_mapel_list: isTeori ? null : (id_mapel_list || null),
  });
  res.json(ruangan);
}

async function destroy(req, res) {
  const ruangan = await Ruangan.findByPk(req.params.id);
  if (!ruangan) return res.status(404).json({ message: 'Ruangan tidak ditemukan' });
  await ruangan.destroy();
  res.json({ message: 'Ruangan berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
