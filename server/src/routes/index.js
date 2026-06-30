const express = require('express');
const router = express.Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');

const authController = require('../controllers/authController');
const guruController = require('../controllers/guruController');
const mapelController = require('../controllers/mataPelajaranController');
const rombelController = require('../controllers/rombelController');
const ruanganController = require('../controllers/ruanganController');
const kontrakController = require('../controllers/kontrakController');
const jadwalController = require('../controllers/jadwalController');
const jurusanController = require('../controllers/jurusanController');
const settingController = require('../controllers/settingController');

// Auth
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);

// Protected + admin only
const admin = [authMiddleware, adminOnly];

// Guru
router.get('/guru', ...admin, guruController.index);
router.get('/guru/:id', ...admin, guruController.show);
router.post('/guru', ...admin, guruController.store);
router.put('/guru/:id', ...admin, guruController.update);
router.delete('/guru/:id', ...admin, guruController.destroy);

// Jurusan
router.get('/jurusan', ...admin, jurusanController.index);
router.get('/jurusan/:id', ...admin, jurusanController.show);
router.post('/jurusan', ...admin, jurusanController.store);
router.put('/jurusan/:id', ...admin, jurusanController.update);
router.delete('/jurusan/:id', ...admin, jurusanController.destroy);

// Mata Pelajaran (order matters: specific routes first)
router.get('/mata-pelajaran/by-tingkat/:tingkat', ...admin, mapelController.getByTingkat);
router.get('/mata-pelajaran/by-guru/:id_guru', ...admin, mapelController.getByGuru);
router.get('/mata-pelajaran', ...admin, mapelController.index);
router.get('/mata-pelajaran/:id', ...admin, mapelController.show);
router.post('/mata-pelajaran', ...admin, mapelController.store);
router.put('/mata-pelajaran/:id', ...admin, mapelController.update);
router.delete('/mata-pelajaran/:id', ...admin, mapelController.destroy);

// Rombel
router.get('/rombel', ...admin, rombelController.index);
router.get('/rombel/:id', ...admin, rombelController.show);
router.post('/rombel', ...admin, rombelController.store);
router.put('/rombel/:id', ...admin, rombelController.update);
router.delete('/rombel/:id', ...admin, rombelController.destroy);

// Ruangan
router.get('/ruangan', ...admin, ruanganController.index);
router.get('/ruangan/:id', ...admin, ruanganController.show);
router.post('/ruangan', ...admin, ruanganController.store);
router.put('/ruangan/:id', ...admin, ruanganController.update);
router.delete('/ruangan/:id', ...admin, ruanganController.destroy);

// Settings
router.get('/settings', ...admin, settingController.getSettings);
router.put('/settings', ...admin, settingController.updateSettings);

// Kontrak Mengajar
router.get('/kontrak-mengajar', ...admin, kontrakController.index);
router.get('/kontrak-mengajar/:id', ...admin, kontrakController.show);
router.post('/kontrak-mengajar', ...admin, kontrakController.store);
router.put('/kontrak-mengajar/:id', ...admin, kontrakController.update);
router.delete('/kontrak-mengajar/:id', ...admin, kontrakController.destroy);

// Jadwal Optimal
router.get('/jadwal', ...admin, jadwalController.index);
router.post('/jadwal/generate', ...admin, jadwalController.generate);
router.get('/jadwal/status', ...admin, jadwalController.status);
router.get('/jadwal/insight', ...admin, jadwalController.insight);
router.get('/jadwal/ruangan-map', ...admin, jadwalController.ruanganMap);

// Dashboard stats
router.get('/dashboard', ...admin, async (req, res) => {
  const { Guru, Rombel, KontrakMengajar, JadwalOptimal } = require('../models');
  const [totalGuru, totalRombel, totalKontrak, totalJadwal, totalRombelPkl] = await Promise.all([
    Guru.count(),
    Rombel.count(),
    KontrakMengajar.count(),
    JadwalOptimal.count(),
    Rombel.count({ where: { is_pkl: true } }),
  ]);
  res.json({ totalGuru, totalRombel, totalKontrak, jadwalSudahDigenerate: totalJadwal > 0, totalJadwal, totalRombelPkl });
});

module.exports = router;
