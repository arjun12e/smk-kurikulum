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

  // Patokan kontrak mengajar = JP milik guru itu sendiri (Guru.total_jam_mengajar).
  // Total JP terkontrak tiap guru di SELURUH kontrak (abaikan filter agar peringatan akurat).
  const semuaKontrak = await KontrakMengajar.findAll({ include: [{ model: Guru }] });
  const jpPerGuru = {};
  const namaGuru = {};
  const batasGuru = {};
  semuaKontrak.forEach(k => {
    jpPerGuru[k.id_guru] = (jpPerGuru[k.id_guru] || 0) + k.jumlah_jp;
    namaGuru[k.id_guru] = k.Guru?.nama_guru || k.id_guru;
    batasGuru[k.id_guru] = k.Guru?.total_jam_mengajar || 0;
  });
  const warnings = Object.entries(jpPerGuru)
    .filter(([id_guru, jp]) => batasGuru[id_guru] > 0 && jp > batasGuru[id_guru])
    .map(([id_guru, total_jp]) => ({ id_guru, nama_guru: namaGuru[id_guru], total_jp, batas: batasGuru[id_guru] }));

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
  // id_rombel sekarang bisa berupa Array: ['RU023', 'RU024']
  const { id_guru, id_mapel, id_rombel, jumlah_jp, max_jam_harian, preferensi_hari, is_pkl } = req.body;

  if (!id_guru || !id_mapel || !id_rombel || !jumlah_jp) {
    return res.status(400).json({ message: 'Field id_guru, id_mapel, id_rombel, jumlah_jp wajib diisi' });
  }

  try {
    // 1. Pastikan id_rombel diproses sebagai Array (antisipasi jika front-end mengirim string tunggal)
    const rombelArray = Array.isArray(id_rombel) ? id_rombel : [id_rombel];
    const kontrakBaruData = [];

    // 2. Looping setiap id_rombel yang dipilih
    for (const rombelId of rombelArray) {
      // Cek duplikat untuk kombinasi ini
      const duplikat = await KontrakMengajar.findOne({ 
        where: { id_guru, id_mapel, id_rombel: rombelId } 
      });

      // Jika tidak duplikat, masukkan ke list antrean simpan
      if (!duplikat) {
        kontrakBaruData.push({
          id_guru,
          id_mapel,
          id_rombel: rombelId,
          jumlah_jp,
          max_jam_harian: max_jam_harian || 6,
          is_pkl: is_pkl || false,
          preferensi_hari: preferensi_hari || { Senin: 3, Selasa: 3, Rabu: 3, Kamis: 3, Jumat: 3, Sabtu: 3 },
        });
      }
    }

    if (kontrakBaruData.length === 0) {
      return res.status(422).json({ message: 'Semua rombel yang dipilih sudah memiliki kontrak ini (Duplikat)' });
    }

    // 3. Simpan semua data sekaligus ke database menggunakan bulkCreate
    const kontrakTerbuat = await KontrakMengajar.bulkCreate(kontrakBaruData);
    
    res.status(201).json({ 
      message: `${kontrakTerbuat.length} kontrak mengajar berhasil ditambahkan`, 
      data: kontrakTerbuat 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Terjadi kesalahan pada server saat menyimpan kontrak' });
  }
}

async function update(req, res) {
  const kontrak = await KontrakMengajar.findByPk(req.params.id);
  if (!kontrak) return res.status(404).json({ message: 'Kontrak tidak ditemukan' });

  const { jumlah_jp, max_jam_harian, preferensi_hari, id_mapel, id_rombel, id_guru, is_pkl } = req.body;
  await kontrak.update({ jumlah_jp, max_jam_harian, preferensi_hari, id_mapel, id_rombel, id_guru, is_pkl });
  res.json(kontrak);
}

async function destroy(req, res) {
  const kontrak = await KontrakMengajar.findByPk(req.params.id);
  if (!kontrak) return res.status(404).json({ message: 'Kontrak tidak ditemukan' });
  await kontrak.destroy();
  res.json({ message: 'Kontrak mengajar berhasil dihapus' });
}

module.exports = { index, show, store, update, destroy };
