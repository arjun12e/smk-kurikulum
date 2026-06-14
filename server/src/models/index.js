const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'viewer'), defaultValue: 'admin' },
}, { tableName: 'users', timestamps: true });

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
  total_jam_mengajar: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
}, { tableName: 'guru', timestamps: false });

const MataPelajaran = sequelize.define('MataPelajaran', {
  id_mapel: { type: DataTypes.STRING(50), primaryKey: true },
  nama_mapel: { type: DataTypes.STRING(150), allowNull: false },
  kategori_mapel: {
    type: DataTypes.ENUM('Produktif', 'Umum', 'Pelajaran Kejuruan', 'Muatan Lokal', 'Pelajaran Pilihan'),
    allowNull: false,
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
}, { tableName: 'rombel', timestamps: false });

const Ruangan = sequelize.define('Ruangan', {
  id_ruangan: { type: DataTypes.STRING(50), primaryKey: true },
  nama_ruangan: { type: DataTypes.STRING(100), allowNull: false },
  jenis_ruangan: { type: DataTypes.ENUM('Teori', 'Lab', 'Bengkel'), allowNull: false },
}, { tableName: 'ruangan', timestamps: false });

const KontrakMengajar = sequelize.define('KontrakMengajar', {
  id_kontrak: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  id_guru: { type: DataTypes.STRING(50), allowNull: false },
  id_mapel: { type: DataTypes.STRING(50), allowNull: false },
  id_rombel: { type: DataTypes.STRING(50), allowNull: false },
  jumlah_jp: { type: DataTypes.INTEGER, allowNull: false },
  max_jam_harian: { type: DataTypes.INTEGER, defaultValue: 6 },
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

// Associations
KontrakMengajar.belongsTo(Guru, { foreignKey: 'id_guru' });
KontrakMengajar.belongsTo(MataPelajaran, { foreignKey: 'id_mapel' });
KontrakMengajar.belongsTo(Rombel, { foreignKey: 'id_rombel' });

JadwalOptimal.belongsTo(Rombel, { foreignKey: 'id_rombel' });
JadwalOptimal.belongsTo(KontrakMengajar, { foreignKey: 'id_kontrak' });
JadwalOptimal.belongsTo(Ruangan, { foreignKey: 'id_ruangan' });

Guru.hasMany(KontrakMengajar, { foreignKey: 'id_guru' });
MataPelajaran.hasMany(KontrakMengajar, { foreignKey: 'id_mapel' });
Rombel.hasMany(KontrakMengajar, { foreignKey: 'id_rombel' });
Rombel.hasMany(JadwalOptimal, { foreignKey: 'id_rombel' });
KontrakMengajar.hasMany(JadwalOptimal, { foreignKey: 'id_kontrak' });
Ruangan.hasMany(JadwalOptimal, { foreignKey: 'id_ruangan' });

module.exports = { sequelize, User, Guru, MataPelajaran, Rombel, Ruangan, KontrakMengajar, JadwalOptimal };
