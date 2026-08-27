const { Setting } = require('../models');

async function getSettings(req, res) {
  let settings = await Setting.findByPk(1);
  
  // Create default settings if they don't exist
  if (!settings) {
    settings = await Setting.create({
      id_setting: 1,
      max_jam_mengajar: 24,
      jatah_jp_x: 50,
      jatah_jp_xi: 50,
      jatah_jp_xii: 50,
      fitur_pkl_aktif: false,
      mode_kurikulum: 'dua_sesi',
    });
  }

  res.json(settings);
}

// Field waktu yang boleh diperbarui dari Settings
const WAKTU_FIELDS = ['jp_menit', 'istirahat_menit', 'jam_mulai_pagi', 'jam_mulai_siang', 'istirahat_setelah_dua_sesi', 'istirahat_setelah_satu_sesi', 'jadwal_khusus', 'jumlah_jp', 'istirahat_list'];

async function updateSettings(req, res) {
  const { max_jam_mengajar, jatah_jp_x, jatah_jp_xi, jatah_jp_xii, fitur_pkl_aktif, mode_kurikulum } = req.body;

  // Ambil field waktu yang ada di body (hanya yang dikirim)
  const waktuUpdate = {};
  WAKTU_FIELDS.forEach(f => { if (req.body[f] !== undefined && req.body[f] !== '') waktuUpdate[f] = req.body[f]; });

  let settings = await Setting.findByPk(1);

  if (!settings) {
    settings = await Setting.create({
      id_setting: 1,
      max_jam_mengajar: max_jam_mengajar || 24,
      jatah_jp_x: jatah_jp_x || 50,
      jatah_jp_xi: jatah_jp_xi || 50,
      jatah_jp_xii: jatah_jp_xii || 50,
      fitur_pkl_aktif: fitur_pkl_aktif || false,
      mode_kurikulum: mode_kurikulum || 'dua_sesi',
      ...waktuUpdate,
    });
  } else {
    await settings.update({
      max_jam_mengajar: max_jam_mengajar !== undefined ? max_jam_mengajar : settings.max_jam_mengajar,
      jatah_jp_x: jatah_jp_x !== undefined ? jatah_jp_x : settings.jatah_jp_x,
      jatah_jp_xi: jatah_jp_xi !== undefined ? jatah_jp_xi : settings.jatah_jp_xi,
      jatah_jp_xii: jatah_jp_xii !== undefined ? jatah_jp_xii : settings.jatah_jp_xii,
      fitur_pkl_aktif: fitur_pkl_aktif !== undefined ? fitur_pkl_aktif : settings.fitur_pkl_aktif,
      mode_kurikulum: mode_kurikulum !== undefined ? mode_kurikulum : settings.mode_kurikulum,
      ...waktuUpdate,
    });
  }
  
  res.json(settings);
}

module.exports = { getSettings, updateSettings };

