/* Uji kapasitas hari khusus: Senin-Pagi & Jumat-Siang hanya 7 JP. */
const modelsPath = require.resolve('./src/models');

const ruangan = [
  { id_ruangan: 'RU1', jenis_ruangan: 'Teori', id_jurusan: null, id_mapel_list: [] },
  { id_ruangan: 'RU2', jenis_ruangan: 'Teori', id_jurusan: null, id_mapel_list: [] },
  { id_ruangan: 'RU3', jenis_ruangan: 'Teori', id_jurusan: null, id_mapel_list: [] },
];
const pref = { hari: { Senin: 5, Selasa: 3, Rabu: 3, Kamis: 3, Jumat: 5, Sabtu: 2 }, shift: { Pagi: 4, Siang: 4 } };

// Banyak kontrak yang "menyukai" Senin & Jumat agar GA tergoda menaruh di sana
const kontrak = [];
for (let i = 1; i <= 12; i++) {
  kontrak.push({ id_kontrak: i, id_guru: `G${i}`, id_mapel: `MP${i}`, id_rombel: `R${(i % 4) + 1}`, jumlah_jp: 8, max_jam_harian: 8, is_pkl: false, preferensi_hari: pref, MataPelajaran: { kategori_mapel: 'Umum', id_jurusan: null, alokasi_per_minggu: 8, jp_diluar: 0 }, Guru: { status_kepegawaian: 'PNS' }, Rombel: { jurusan: 'TKJ', is_pkl: false } });
}

const wrap = (rows) => rows.map(r => ({ ...r, toJSON: () => r }));
let saved = [];
require.cache[modelsPath] = {
  id: modelsPath, filename: modelsPath, loaded: true,
  exports: {
    KontrakMengajar: { findAll: async () => wrap(kontrak) },
    Guru: {}, MataPelajaran: {}, Rombel: {},
    Ruangan: { findAll: async () => wrap(ruangan) },
    Setting: { findByPk: async () => ({
      mode_kurikulum: 'dua_sesi',
      jadwal_khusus: {
        'Senin-Pagi': { aktif: true, label: 'Upacara', jam_mulai: '08:00', jp_menit: 30, istirahat_menit: 30, istirahat_setelah: 4, max_jp: 7 },
        'Jumat-Siang': { aktif: true, label: 'Sholat Jumat', jam_mulai: '13:00', jp_menit: 30, istirahat_menit: 35, istirahat_setelah: 4, max_jp: 7 },
      },
    }) },
    JadwalOptimal: { destroy: async () => {}, bulkCreate: async (rows) => { saved = rows; } },
  },
};

const { jalankan } = require('./src/services/genetikaService');

(async () => {
  const result = await jalankan();
  const seninPagi = saved.filter(r => r.hari === 'Senin' && r.waktu_shift === 'Pagi');
  const jumatSiang = saved.filter(r => r.hari === 'Jumat' && r.waktu_shift === 'Siang');
  const maxSeninPagi = seninPagi.length ? Math.max(...seninPagi.map(r => r.slot_jam)) : 0;
  const maxJumatSiang = jumatSiang.length ? Math.max(...jumatSiang.map(r => r.slot_jam)) : 0;
  const checks = [
    ['Senin Pagi: tidak ada slot > 7', maxSeninPagi <= 7],
    ['Jumat Siang: tidak ada slot > 7', maxJumatSiang <= 7],
    ['Hari normal boleh sampai 8', Math.max(...saved.map(r => r.slot_jam)) <= 8],
    ['0 pelanggaran', result.pelanggaranHard === 0],
  ];
  console.log('HASIL:', result, `| Senin-Pagi maxSlot=${maxSeninPagi}, Jumat-Siang maxSlot=${maxJumatSiang}`);
  console.log(checks.map(([n, ok]) => `${ok ? '✓' : '✗'} ${n}`).join('\n'));
  console.log(checks.every(c => c[1]) ? '\nSEMUA LULUS ✓' : '\nADA YANG GAGAL ✗');
  process.exit(0);
})();
