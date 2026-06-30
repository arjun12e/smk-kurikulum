/**
 * Migrasi skema idempotent (aman dijalankan berkali-kali, TIDAK menghapus data).
 * Menambahkan kolom yang dipakai model tapi mungkin belum ada di database.
 *
 * Jalankan: npm run migrate
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('./models');

// [table, column, DDL type]
const COLUMNS = [
  ['guru', 'id_jurusan', 'VARCHAR(200) NULL'],
  ['mata_pelajaran', 'id_jurusan', 'VARCHAR(50) NULL'],
  ['mata_pelajaran', 'tingkat', "SET('X','XI','XII') NULL"],
  ['mata_pelajaran', 'jenis_guru', 'VARCHAR(100) NULL'],
  ['rombel', 'is_pkl', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['kontrak_mengajar', 'is_pkl', 'TINYINT(1) NOT NULL DEFAULT 0'],
  ['ruangan', 'id_jurusan', 'VARCHAR(50) NULL'],
  ['ruangan', 'id_mapel_list', 'TEXT NULL'],
  ['settings', 'mode_kurikulum', "ENUM('satu_sesi','dua_sesi') NOT NULL DEFAULT 'dua_sesi'"],
  ['settings', 'jp_menit', 'INT NOT NULL DEFAULT 40'],
  ['settings', 'istirahat_menit', 'INT NOT NULL DEFAULT 35'],
  ['settings', 'jam_mulai_pagi', "VARCHAR(5) NOT NULL DEFAULT '07:00'"],
  ['settings', 'jam_mulai_siang', "VARCHAR(5) NOT NULL DEFAULT '13:00'"],
  ['settings', 'istirahat_setelah_dua_sesi', 'INT NOT NULL DEFAULT 4'],
  ['settings', 'istirahat_setelah_satu_sesi', 'INT NOT NULL DEFAULT 5'],
];

async function kolomAda(db, table, col) {
  const [rows] = await sequelize.query(
    'SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_schema=? AND table_name=? AND column_name=?',
    { replacements: [db, table, col] }
  );
  return rows[0].c > 0;
}

(async () => {
  await sequelize.authenticate();
  const db = sequelize.config.database;
  let ditambah = 0;
  for (const [table, col, ddl] of COLUMNS) {
    if (await kolomAda(db, table, col)) continue;
    await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${ddl}`);
    console.log(`+ ${table}.${col}`);
    ditambah++;
  }
  console.log(ditambah === 0 ? 'Skema sudah terbaru, tidak ada perubahan.' : `Migrasi selesai: ${ditambah} kolom ditambahkan.`);
  process.exit(0);
})().catch(e => { console.error('Migrasi GAGAL:', e.message); process.exit(1); });
