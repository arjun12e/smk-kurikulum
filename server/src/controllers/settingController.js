const { Setting } = require('../models');

async function getSettings(req, res) {
  let settings = await Setting.findByPk(1);
  
  // Create default settings if they don't exist
  if (!settings) {
    settings = await Setting.create({
      id_setting: 1,
      max_jam_mengajar: 24,
      jatah_mapel_x: 14,
      jatah_mapel_xi: 14,
      jatah_mapel_xii: 14,
      fitur_pkl_aktif: false,
      mode_kurikulum: 'dua_sesi',
    });
  }

  res.json(settings);
}

// Field waktu yang boleh diperbarui dari Settings
const WAKTU_FIELDS = ['jp_menit', 'istirahat_menit', 'jam_mulai_pagi', 'jam_mulai_siang', 'istirahat_setelah_dua_sesi', 'istirahat_setelah_satu_sesi'];

async function updateSettings(req, res) {
  const { max_jam_mengajar, jatah_mapel_x, jatah_mapel_xi, jatah_mapel_xii, fitur_pkl_aktif, mode_kurikulum } = req.body;

  // Ambil field waktu yang ada di body (hanya yang dikirim)
  const waktuUpdate = {};
  WAKTU_FIELDS.forEach(f => { if (req.body[f] !== undefined && req.body[f] !== '') waktuUpdate[f] = req.body[f]; });

  let settings = await Setting.findByPk(1);

  if (!settings) {
    settings = await Setting.create({
      id_setting: 1,
      max_jam_mengajar: max_jam_mengajar || 24,
      jatah_mapel_x: jatah_mapel_x || 14,
      jatah_mapel_xi: jatah_mapel_xi || 14,
      jatah_mapel_xii: jatah_mapel_xii || 14,
      fitur_pkl_aktif: fitur_pkl_aktif || false,
      mode_kurikulum: mode_kurikulum || 'dua_sesi',
      ...waktuUpdate,
    });
  } else {
    await settings.update({
      max_jam_mengajar: max_jam_mengajar !== undefined ? max_jam_mengajar : settings.max_jam_mengajar,
      jatah_mapel_x: jatah_mapel_x !== undefined ? jatah_mapel_x : settings.jatah_mapel_x,
      jatah_mapel_xi: jatah_mapel_xi !== undefined ? jatah_mapel_xi : settings.jatah_mapel_xi,
      jatah_mapel_xii: jatah_mapel_xii !== undefined ? jatah_mapel_xii : settings.jatah_mapel_xii,
      fitur_pkl_aktif: fitur_pkl_aktif !== undefined ? fitur_pkl_aktif : settings.fitur_pkl_aktif,
      mode_kurikulum: mode_kurikulum !== undefined ? mode_kurikulum : settings.mode_kurikulum,
      ...waktuUpdate,
    });
  }
  
  res.json(settings);
}

module.exports = { getSettings, updateSettings };
