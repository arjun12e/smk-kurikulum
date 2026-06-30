const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'viewer'), defaultValue: 'admin' },
}, { tableName: 'users', timestamps: true });

const Jurusan = sequelize.define('Jurusan', {
  id_jurusan: { type: DataTypes.STRING(50), primaryKey: true },
  nama_jurusan: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'jurusan', timestamps: false });

const Guru = sequelize.define('Guru', {
  id_guru: { type: DataTypes.STRING(50), primaryKey: true },
  nama_guru: { type: DataTypes.STRING(150), allowNull: false },
  status_kepegawaian: { type: DataTypes.ENUM('GTY', 'PNS', 'GTT'), allowNull: false },
  jenis_guru: {
    type: DataTypes.STRING(100),
    allowNull: false,
    get() {
      const val = this.getDataValue('jenis_guru');
      if (!val) return [];
      return val.split(',').map(v => v.trim());
    },
    set(val) {
      if (Array.isArray(val)) {
        this.setDataValue('jenis_guru', val.join(','));
      } else {
        this.setDataValue('jenis_guru', val);
      }
    },
  },
  id_jurusan: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Comma-separated jurusan IDs for teachers who teach in multiple majors',
    get() {
      const val = this.getDataValue('id_jurusan');
      if (!val) return [];
      return val.split(',').map(v => v.trim());
    },
    set(val) {
      if (Array.isArray(val)) {
        this.setDataValue('id_jurusan', val.length ? val.join(',') : null);
      } else {
        this.setDataValue('id_jurusan', val || null);
      }
    },
  },
  total_jam_mengajar: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
}, { tableName: 'guru', timestamps: false });

const MataPelajaran = sequelize.define('MataPelajaran', {
  id_mapel: { type: DataTypes.STRING(50), primaryKey: true },
  nama_mapel: { type: DataTypes.STRING(150), allowNull: false },
  kategori_mapel: {
    type: DataTypes.ENUM('Produktif', 'Umum', 'Pelajaran Kejuruan', 'Muatan Lokal', 'Pelajaran Pilihan'),
    allowNull: false,
  },
  tingkat: {
    type: 'SET("X", "XI", "XII")',
    allowNull: true,
    comment: 'Tingkat/kelas yang mengajar mata pelajaran ini',
  },
  jenis_guru: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Comma-separated jenis guru yang cocok mengajar (Jurusan, Umum)',
    get() {
      const val = this.getDataValue('jenis_guru');
      if (!val) return [];
      return val.split(',').map(v => v.trim());
    },
    set(val) {
      if (Array.isArray(val)) {
        this.setDataValue('jenis_guru', val.join(','));
      } else if (val) {
        this.setDataValue('jenis_guru', val);
      }
    },
  },
  id_jurusan: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Jurusan pemilik mapel produktif. Menentukan Lab/Bengkel saat penjadwalan. NULL = ikut jurusan rombel',
  },
  alokasi_per_minggu: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  jp_diluar: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  total_jumlah_jp: {
    type: DataTypes.VIRTUAL,
    get() {
      const alokasi = this.getDataValue('alokasi_per_minggu') || 0;
      const diluar = this.getDataValue('jp_diluar') || 0;
      return alokasi - diluar;
    },
  },
}, { tableName: 'mata_pelajaran', timestamps: false });

const Rombel = sequelize.define('Rombel', {
  id_rombel: { type: DataTypes.STRING(50), primaryKey: true },
  nama_rombel: { type: DataTypes.STRING(50), allowNull: false },
  tingkat: { type: DataTypes.ENUM('X', 'XI', 'XII'), allowNull: false },
  jurusan: { type: DataTypes.STRING(50), allowNull: false },
  is_pkl: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Marks if this is a PKL (internship) class' },
}, { tableName: 'rombel', timestamps: false });

const Ruangan = sequelize.define('Ruangan', {
  id_ruangan: { type: DataTypes.STRING(50), primaryKey: true },
  nama_ruangan: { type: DataTypes.STRING(100), allowNull: false },
  jenis_ruangan: { type: DataTypes.ENUM('Teori', 'Lab', 'Bengkel'), allowNull: false },
  id_jurusan: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Jurusan pemilik ruangan praktik (Lab/Bengkel). NULL = ruangan teori/umum',
  },
  id_mapel_list: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Daftar id_mapel yang boleh di ruangan ini (comma-separated). Untuk Lab/Bengkel. Kosong = pakai aturan jurusan',
    get() {
      const val = this.getDataValue('id_mapel_list');
      if (!val) return [];
      return val.split(',').map(v => v.trim()).filter(Boolean);
    },
    set(val) {
      if (Array.isArray(val)) this.setDataValue('id_mapel_list', val.length ? val.join(',') : null);
      else this.setDataValue('id_mapel_list', val || null);
    },
  },
}, { tableName: 'ruangan', timestamps: false });

const KontrakMengajar = sequelize.define('KontrakMengajar', {
  id_kontrak: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_guru: { type: DataTypes.STRING(50), allowNull: false },
  id_mapel: { type: DataTypes.STRING(50), allowNull: false },
  id_rombel: { type: DataTypes.STRING(50), allowNull: false },
  jumlah_jp: { type: DataTypes.INTEGER, allowNull: false },
  max_jam_harian: { type: DataTypes.INTEGER, defaultValue: 6 },
  is_pkl: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Marks if this is a PKL (internship) contract' },
  preferensi_hari: {
    type: DataTypes.TEXT,
    get() {
      const val = this.getDataValue('preferensi_hari');
      return val ? JSON.parse(val) : {};
    },
    set(val) {
      this.setDataValue('preferensi_hari', JSON.stringify(val));
    },
  },
}, { tableName: 'kontrak_mengajar', timestamps: false });

const JadwalOptimal = sequelize.define('JadwalOptimal', {
  id_jadwal: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_rombel: { type: DataTypes.STRING(50) },
  id_kontrak: { type: DataTypes.INTEGER },
  id_ruangan: { type: DataTypes.STRING(50) },
  hari: { type: DataTypes.ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'), allowNull: false },
  slot_jam: { type: DataTypes.INTEGER, allowNull: false },
  waktu_shift: { type: DataTypes.ENUM('Pagi', 'Siang'), allowNull: false },
}, { tableName: 'jadwal_optimal', timestamps: false });

const Setting = sequelize.define('Setting', {
  id_setting: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  max_jam_mengajar: { type: DataTypes.INTEGER, defaultValue: 24, comment: 'Maximum teaching hours per week per teacher' },
  jatah_mapel_x: { type: DataTypes.INTEGER, defaultValue: 14, comment: 'Max subjects quota for class X' },
  jatah_mapel_xi: { type: DataTypes.INTEGER, defaultValue: 14, comment: 'Max subjects quota for class XI' },
  jatah_mapel_xii: { type: DataTypes.INTEGER, defaultValue: 14, comment: 'Max subjects quota for class XII' },
  fitur_pkl_aktif: { type: DataTypes.BOOLEAN, defaultValue: false, comment: 'Enable/disable PKL feature' },
  mode_kurikulum: {
    type: DataTypes.ENUM('satu_sesi', 'dua_sesi'),
    defaultValue: 'dua_sesi',
    comment: 'satu_sesi: Senin-Jumat 1 sesi (10 JP/hari); dua_sesi: Senin-Sabtu Pagi/Siang',
  },
  // Pengaturan waktu untuk kalender akademik
  jp_menit: { type: DataTypes.INTEGER, defaultValue: 40, comment: 'Durasi 1 JP (menit)' },
  istirahat_menit: { type: DataTypes.INTEGER, defaultValue: 35, comment: 'Durasi istirahat (menit)' },
  jam_mulai_pagi: { type: DataTypes.STRING(5), defaultValue: '07:00', comment: 'Jam mulai sesi Pagi / satu sesi (HH:MM)' },
  jam_mulai_siang: { type: DataTypes.STRING(5), defaultValue: '13:00', comment: 'Jam mulai sesi Siang (HH:MM)' },
  istirahat_setelah_dua_sesi: { type: DataTypes.INTEGER, defaultValue: 4, comment: 'Istirahat setelah JP ke-? (mode dua sesi)' },
  istirahat_setelah_satu_sesi: { type: DataTypes.INTEGER, defaultValue: 5, comment: 'Istirahat setelah JP ke-? (mode satu sesi)' },
}, { tableName: 'settings', timestamps: false });

// Associations
KontrakMengajar.belongsTo(Guru, { foreignKey: 'id_guru' });
KontrakMengajar.belongsTo(MataPelajaran, { foreignKey: 'id_mapel' });
KontrakMengajar.belongsTo(Rombel, { foreignKey: 'id_rombel' });

JadwalOptimal.belongsTo(Rombel, { foreignKey: 'id_rombel' });
JadwalOptimal.belongsTo(KontrakMengajar, { foreignKey: 'id_kontrak', onDelete: 'CASCADE'});
JadwalOptimal.belongsTo(Ruangan, { foreignKey: 'id_ruangan' });
Ruangan.belongsTo(Jurusan, { foreignKey: 'id_jurusan' });
MataPelajaran.belongsTo(Jurusan, { foreignKey: 'id_jurusan' });

Guru.hasMany(KontrakMengajar, { foreignKey: 'id_guru' });
MataPelajaran.hasMany(KontrakMengajar, { foreignKey: 'id_mapel' });
Rombel.hasMany(KontrakMengajar, { foreignKey: 'id_rombel' });
Rombel.hasMany(JadwalOptimal, { foreignKey: 'id_rombel' });
KontrakMengajar.hasMany(JadwalOptimal, { foreignKey: 'id_kontrak' });
Ruangan.hasMany(JadwalOptimal, { foreignKey: 'id_ruangan' });

module.exports = { sequelize, User, Guru, Jurusan, MataPelajaran, Rombel, Ruangan, KontrakMengajar, JadwalOptimal, Setting };
