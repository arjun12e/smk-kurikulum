require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User, Guru, Jurusan, MataPelajaran, Rombel, Ruangan, KontrakMengajar, Setting } = require('../models');

async function seed() {
  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  // Cek apakah data sudah ada
  const guruCount = await Guru.count();
  if (guruCount > 0) {
    console.log('Data sudah ada, seeder dilewati');
    process.exit(0);
  }

  // Users
  await User.create({
    name: 'Administrator',
    email: 'admin@smkpasundan2.sch.id',
    password: await bcrypt.hash('admin123', 10),
    role: 'admin',
  });

  // Jurusan
  const jurusanData = [
    { id_jurusan: 'TAV', nama_jurusan: 'Teknik Audio Video' },
    { id_jurusan: 'TPM', nama_jurusan: 'Teknik Permesinan' },
    { id_jurusan: 'TKR', nama_jurusan: 'Teknik Kendaraan Ringan' },
    { id_jurusan: 'TKJ', nama_jurusan: 'Teknik Komputer Jaringan' },
    { id_jurusan: 'TSM', nama_jurusan: 'Teknik Sepeda Motor' },
  ];
  await Jurusan.bulkCreate(jurusanData);

  // Guru (18 guru)
  const guruData = [
    { id_guru: 'G001', nama_guru: 'Alip Syahrudin, S.T, M.M.', status_kepegawaian: 'PNS', jenis_guru: 'Jurusan', id_jurusan: 'TAV', total_jam_mengajar: 12 },
    { id_guru: 'G002', nama_guru: 'Endang Anjar R M, S.Pd. M.M.', status_kepegawaian: 'GTY', jenis_guru: 'Jurusan', id_jurusan: 'TAV', total_jam_mengajar: 12 },
    { id_guru: 'G003', nama_guru: 'Ai Rosyani Yaman, S.Pd, M.Pd.', status_kepegawaian: 'PNS', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 36 },
    { id_guru: 'G004', nama_guru: 'Ai I Anah, S.Pd.', status_kepegawaian: 'GTY', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 38 },
    { id_guru: 'G005', nama_guru: 'Umar Khatob, S.Pd. M.Pd', status_kepegawaian: 'GTY', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 12 },
    { id_guru: 'G006', nama_guru: 'Hendry C. Irawan, ST, MT, CCNA', status_kepegawaian: 'PNS', jenis_guru: 'Jurusan', id_jurusan: 'TKJ', total_jam_mengajar: 30 },
    { id_guru: 'G007', nama_guru: 'Euis Enab Sumiati, S.Pd', status_kepegawaian: 'GTT', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 24 },
    { id_guru: 'G008', nama_guru: 'Edi Permana Wijaya, S.Pd', status_kepegawaian: 'GTT', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 44},
    { id_guru: 'G009', nama_guru: 'Darisman, SE.', status_kepegawaian: 'GTT', jenis_guru: 'Jurusan', id_jurusan: 'TPM', total_jam_mengajar: 39 },
    { id_guru: 'G010', nama_guru: 'Drs. H. Ahmad Soleh Muslim', status_kepegawaian: 'GTY', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 40 },
    { id_guru: 'G011', nama_guru: 'Abdurrohim Ardiansyah, ST', status_kepegawaian: 'GTT', jenis_guru: 'Jurusan', id_jurusan: 'TKJ', total_jam_mengajar: 10 },
    { id_guru: 'G012', nama_guru: 'Rudiaman, S.Sn.', status_kepegawaian: 'GTT', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 24 },
    { id_guru: 'G013', nama_guru: 'Robi Rohmat, ST.', status_kepegawaian: 'GTT', jenis_guru: 'Jurusan', id_jurusan: 'TKR', total_jam_mengajar: 32 },
    { id_guru: 'G014', nama_guru: 'Adi Janwar, SST.', status_kepegawaian: 'GTT', jenis_guru: 'Jurusan', id_jurusan: 'TSM', total_jam_mengajar: 32},
    { id_guru: 'G015', nama_guru: 'Tarmo, A.Md,', status_kepegawaian: 'GTY', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 24 },
    { id_guru: 'G016', nama_guru: 'Ratih Yuniarti, SST, M.Ak', status_kepegawaian: 'GTT', jenis_guru: 'Jurusan', id_jurusan: 'TPM', total_jam_mengajar: 18 },
    { id_guru: 'G017', nama_guru: 'Deni, S.Tr.T.', status_kepegawaian: 'GTT', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 32 },
    { id_guru: 'G018', nama_guru: 'Ilham Bintang Guntara, S.Pd', status_kepegawaian: 'GTT', jenis_guru: 'Umum', id_jurusan: null, total_jam_mengajar: 28 },
  ];
  await Guru.bulkCreate(guruData);

  // Mata Pelajaran (20 mapel) - with tingkat and jenis_guru_yang_cocok
  const mapelData = [
    { id_mapel: 'MP001', nama_mapel: 'Pendidikan Agama Islam', kategori_mapel: 'Umum', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 3, jp_diluar: 1 },
    { id_mapel: 'MP002', nama_mapel: 'Pendidikan Pancasila', kategori_mapel: 'Umum', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 3, jp_diluar: 0 },
    { id_mapel: 'MP003', nama_mapel: 'Bahasa Indonesia', kategori_mapel: 'Umum', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 4, jp_diluar: 1 },
    { id_mapel: 'MP004', nama_mapel: 'PJOK', kategori_mapel: 'Umum', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 3, jp_diluar: 3 },
    { id_mapel: 'MP005', nama_mapel: 'Sejarah', kategori_mapel: 'Umum', tingkat: 'XI', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 2, jp_diluar: 0 },
    { id_mapel: 'MP006', nama_mapel: 'Seni Budaya (Seni Musik)', kategori_mapel: 'Umum', tingkat: 'XI', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 2, jp_diluar: 0 },
    { id_mapel: 'MP007', nama_mapel: 'Matematika', kategori_mapel: 'Pelajaran Kejuruan', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP008', nama_mapel: 'Bahasa Inggris', kategori_mapel: 'Pelajaran Kejuruan', tingkat: 'XI', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 4, jp_diluar: 1 },
    { id_mapel: 'MP009', nama_mapel: 'Informatika', kategori_mapel: 'Pelajaran Kejuruan', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', alokasi_per_minggu: 4, jp_diluar: 2 },
    { id_mapel: 'MP010', nama_mapel: 'Projek Ilmu Pengetahuan Alam dan Sosial', kategori_mapel: 'Pelajaran Kejuruan', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 6, jp_diluar: 3 },
    { id_mapel: 'MP011', nama_mapel: 'Bahasa Jepang', kategori_mapel: 'Pelajaran Kejuruan', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', alokasi_per_minggu: 2, jp_diluar: 0 },
    { id_mapel: 'MP012', nama_mapel: 'Dasar Dasar Program Keahlian (TE)', kategori_mapel: 'Produktif', tingkat: 'X', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TAV', alokasi_per_minggu: 12, jp_diluar: 0 },
    { id_mapel: 'MP013', nama_mapel: 'Dasar Dasar Program Keahlian (TM)', kategori_mapel: 'Produktif', tingkat: 'X', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TPM', alokasi_per_minggu: 12, jp_diluar: 0 },
    { id_mapel: 'MP014', nama_mapel: 'Dasar Dasar Program Keahlian (TO)', kategori_mapel: 'Produktif', tingkat: 'X', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKR', alokasi_per_minggu: 12, jp_diluar: 0 },
    { id_mapel: 'MP015', nama_mapel: 'Dasar Dasar Program Keahlian (TJKT)', kategori_mapel: 'Produktif', tingkat: 'X', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKJ', alokasi_per_minggu: 12, jp_diluar: 0 },
    { id_mapel: 'MP016', nama_mapel: 'Projek Kreatif Kewirausahaan (TAV)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TAV', alokasi_per_minggu: 5, jp_diluar: 0 },
    { id_mapel: 'MP017', nama_mapel: 'Projek Kreatif Kewirausahaan (TPM)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TPM', alokasi_per_minggu: 5, jp_diluar: 0 },
    { id_mapel: 'MP018', nama_mapel: 'Projek Kreatif Kewirausahaan (TKR)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKR', alokasi_per_minggu: 5, jp_diluar: 0 },
    { id_mapel: 'MP019', nama_mapel: 'Projek Kreatif Kewirausahaan (TKJ)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKJ', alokasi_per_minggu: 5, jp_diluar: 0 },
    { id_mapel: 'MP020', nama_mapel: 'Projek Kreatif Kewirausahaan (TSM)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TSM', alokasi_per_minggu: 5, jp_diluar: 0 },
    { id_mapel: 'MP021', nama_mapel: 'Mata Pelajaran Pilihan (TAV)', kategori_mapel: 'Produktif', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TAV', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP022', nama_mapel: 'Mata Pelajaran Pilihan (TPM)', kategori_mapel: 'Produktif', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TPM', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP023', nama_mapel: 'Mata Pelajaran Pilihan (TKR)', kategori_mapel: 'Produktif', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKR', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP024', nama_mapel: 'Mata Pelajaran Pilihan (TKJ)', kategori_mapel: 'Produktif', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKJ', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP025', nama_mapel: 'Mata Pelajaran Pilihan (TSM)', kategori_mapel: 'Produktif', tingkat: 'XI', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TSM', alokasi_per_minggu: 4, jp_diluar: 0 },
    { id_mapel: 'MP026', nama_mapel: 'Kosentrasi Keahlian (TAV)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TAV', alokasi_per_minggu: 18, jp_diluar: 0 },
    { id_mapel: 'MP027', nama_mapel: 'Kosentrasi Keahlian (TPM)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TPM', alokasi_per_minggu: 18, jp_diluar: 0 },
    { id_mapel: 'MP028', nama_mapel: 'Kosentrasi Keahlian (TKR)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKR', alokasi_per_minggu: 18, jp_diluar: 0 },
    { id_mapel: 'MP029', nama_mapel: 'Kosentrasi Keahlian (TKJ)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TKJ', alokasi_per_minggu: 18, jp_diluar: 0 },
    { id_mapel: 'MP030', nama_mapel: 'Kosentrasi Keahlian (TSM)', kategori_mapel: 'Produktif', tingkat: 'XII', jenis_guru_yang_cocok: 'Jurusan', id_jurusan: 'TSM', alokasi_per_minggu: 18, jp_diluar: 0 },
    { id_mapel: 'MP031', nama_mapel: 'Muatan Lokal Sunda', kategori_mapel: 'Muatan Lokal', tingkat: 'X', jenis_guru_yang_cocok: 'Umum', alokasi_per_minggu: 2, jp_diluar: 0 },
  ];
  await MataPelajaran.bulkCreate(mapelData);

  // Rombel (10 rombel)
  const rombelData = [
    { id_rombel: 'R001', nama_rombel: 'XI TAV 1', tingkat: 'XI', jurusan: 'TAV' },
    { id_rombel: 'R002', nama_rombel: 'XI TPM 1', tingkat: 'XI', jurusan: 'TPM' },
    { id_rombel: 'R003', nama_rombel: 'XI TPM 2', tingkat: 'XI', jurusan: 'TPM' },
    { id_rombel: 'R004', nama_rombel: 'XI TKR 1', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R005', nama_rombel: 'XI TKR 2', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R006', nama_rombel: 'XI TKR 3', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R007', nama_rombel: 'XI TKR 4', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R008', nama_rombel: 'XI TKR 5', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R009', nama_rombel: 'XI TKR 6', tingkat: 'XI', jurusan: 'TKR' },
    { id_rombel: 'R010', nama_rombel: 'XI TKJ 1', tingkat: 'XI', jurusan: 'TKJ' },
    { id_rombel: 'R011', nama_rombel: 'XI TKJ 2', tingkat: 'XI', jurusan: 'TKJ' },
    { id_rombel: 'R012', nama_rombel: 'XI TKJ 3', tingkat: 'XI', jurusan: 'TKJ' },
    { id_rombel: 'R013', nama_rombel: 'XI TKJ 4', tingkat: 'XI', jurusan: 'TKJ' },
    { id_rombel: 'R014', nama_rombel: 'XI TKJ 5', tingkat: 'XI', jurusan: 'TKJ' },
    { id_rombel: 'R015', nama_rombel: 'XII TAV 1', tingkat: 'XII', jurusan: 'TAV' },
    { id_rombel: 'R016', nama_rombel: 'XII TAV 2', tingkat: 'XII', jurusan: 'TAV' },
    { id_rombel: 'R017', nama_rombel: 'XII TPM 1', tingkat: 'XII', jurusan: 'TPM' },
    { id_rombel: 'R018', nama_rombel: 'XII TPM 2', tingkat: 'XII', jurusan: 'TPM' },
    { id_rombel: 'R019', nama_rombel: 'XII TKR 1', tingkat: 'XII', jurusan: 'TKR' },
    { id_rombel: 'R020', nama_rombel: 'XII TKR 2', tingkat: 'XII', jurusan: 'TKR' },
    { id_rombel: 'R021', nama_rombel: 'XII TKR 3', tingkat: 'XII', jurusan: 'TKR' },
    { id_rombel: 'R022', nama_rombel: 'XII TKJ 1', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R023', nama_rombel: 'XII TKJ 2', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R024', nama_rombel: 'XII TKJ 3', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R025', nama_rombel: 'XII TKJ 4', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R026', nama_rombel: 'XII TKJ 5', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R027', nama_rombel: 'XII TKJ 6', tingkat: 'XII', jurusan: 'TKJ' },
    { id_rombel: 'R028', nama_rombel: 'XII TSM 1', tingkat: 'XII', jurusan: 'TSM' },
    { id_rombel: 'R029', nama_rombel: 'XII TSM 2', tingkat: 'XII', jurusan: 'TSM' },
    { id_rombel: 'R030', nama_rombel: 'XII TSM 3', tingkat: 'XII', jurusan: 'TSM' },
    { id_rombel: 'R031', nama_rombel: 'XII TSM 4', tingkat: 'XII', jurusan: 'TSM' },
    { id_rombel: 'R032', nama_rombel: 'XII TSM 5', tingkat: 'XII', jurusan: 'TSM' },
    
  ];
  await Rombel.bulkCreate(rombelData);

  // Ruangan (9 ruangan)
  const ruanganData = [
    { id_ruangan: 'RU001', nama_ruangan: 'Ruang Teori 1', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU002', nama_ruangan: 'Ruang Teori 2', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU003', nama_ruangan: 'Ruang Teori 3', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU004', nama_ruangan: 'Ruang Teori 4', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU005', nama_ruangan: 'Ruang Teori 5', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU006', nama_ruangan: 'Ruang Teori 6', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU007', nama_ruangan: 'Ruang Teori 7', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU008', nama_ruangan: 'Ruang Teori 8', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU009', nama_ruangan: 'Ruang Teori 9', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU010', nama_ruangan: 'Ruang Teori 10', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU011', nama_ruangan: 'Ruang Teori 11', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU012', nama_ruangan: 'Ruang Teori 12', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU013', nama_ruangan: 'Ruang Teori 13', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU014', nama_ruangan: 'Ruang Teori 14', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU015', nama_ruangan: 'Ruang Teori 15', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU016', nama_ruangan: 'Ruang Teori 16', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU017', nama_ruangan: 'Ruang Teori 17', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU018', nama_ruangan: 'Ruang Teori 18', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU019', nama_ruangan: 'Ruang Teori 19', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU020', nama_ruangan: 'Ruang Teori 29', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU021', nama_ruangan: 'Ruang Teori 21', jenis_ruangan: 'Teori' },
    { id_ruangan: 'RU022', nama_ruangan: 'Lab TAV', jenis_ruangan: 'Lab', id_jurusan: 'TAV' },
    { id_ruangan: 'RU023', nama_ruangan: 'Lab 1 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU024', nama_ruangan: 'Lab 2 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU025', nama_ruangan: 'Lab 3 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU026', nama_ruangan: 'Lab 4 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU027', nama_ruangan: 'Lab 5 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU028', nama_ruangan: 'Lab 6 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU029', nama_ruangan: 'Lab 7 TKJ', jenis_ruangan: 'Lab', id_jurusan: 'TKJ' },
    { id_ruangan: 'RU030', nama_ruangan: 'Bengkel TSM', jenis_ruangan: 'Bengkel', id_jurusan: 'TSM' },
    { id_ruangan: 'RU031', nama_ruangan: 'Bengkel TKR', jenis_ruangan: 'Bengkel', id_jurusan: 'TKR' },
    { id_ruangan: 'RU032', nama_ruangan: 'Bengkel TPM', jenis_ruangan: 'Bengkel', id_jurusan: 'TPM' },
  ];
  await Ruangan.bulkCreate(ruanganData);

  const preferensiDefault = (prioritas) => {
    const pref = {
      hari: { Senin: 3, Selasa: 3, Rabu: 3, Kamis: 3, Jumat: 2, Sabtu: 1 },
      shift: { Pagi: 3, Siang: 3 }
    };

    if (prioritas === 'pagi') { 
      pref.shift.Pagi = 5;   // Sangat suka shift Pagi
      pref.shift.Siang = 1;  // Tidak suka shift Siang
      pref.hari = { Senin: 4, Selasa: 4, Rabu: 4, Kamis: 4, Jumat: 4, Sabtu: 3 };
    }
    
    if (prioritas === 'akhir') { 
      pref.shift.Pagi = 2;   // Kurang suka shift Pagi
      pref.shift.Siang = 5;  // Sangat suka shift Siang
      pref.hari = { Senin: 2, Selasa: 3, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 5 };
    }
    
    return pref;
  };

  const kontrakData = [
    { id_guru: 'G001', id_mapel: 'MP009', id_rombel: 'R001', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G001', id_mapel: 'MP019', id_rombel: 'R004', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G002', id_mapel: 'MP010', id_rombel: 'R001', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G002', id_mapel: 'MP011', id_rombel: 'R004', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G003', id_mapel: 'MP012', id_rombel: 'R006', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G004', id_mapel: 'MP001', id_rombel: 'R001', jumlah_jp: 3, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G004', id_mapel: 'MP001', id_rombel: 'R002', jumlah_jp: 3, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G005', id_mapel: 'MP002', id_rombel: 'R001', jumlah_jp: 3, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G005', id_mapel: 'MP002', id_rombel: 'R003', jumlah_jp: 3, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G006', id_mapel: 'MP013', id_rombel: 'R006', jumlah_jp: 4, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G007', id_mapel: 'MP014', id_rombel: 'R009', jumlah_jp: 4, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G008', id_mapel: 'MP003', id_rombel: 'R002', jumlah_jp: 3, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G009', id_mapel: 'MP011', id_rombel: 'R005', jumlah_jp: 4, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G010', id_mapel: 'MP015', id_rombel: 'R003', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G010', id_mapel: 'MP016', id_rombel: 'R007', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G011', id_mapel: 'MP020', id_rombel: 'R002', jumlah_jp: 4, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G012', id_mapel: 'MP004', id_rombel: 'R001', jumlah_jp: 2, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G013', id_mapel: 'MP009', id_rombel: 'R008', jumlah_jp: 4, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G015', id_mapel: 'MP017', id_rombel: 'R010', jumlah_jp: 4, preferensi_hari: preferensiDefault('pagi') },
    { id_guru: 'G016', id_mapel: 'MP016', id_rombel: 'R010', jumlah_jp: 3, preferensi_hari: preferensiDefault('akhir') },
    { id_guru: 'G018', id_mapel: 'MP005', id_rombel: 'R001', jumlah_jp: 2, preferensi_hari: preferensiDefault('pagi') },
  ];

  for (const k of kontrakData) {
    await KontrakMengajar.create({ ...k, max_jam_harian: 6 });
  }

  // Settings
  await Setting.create({
    id_setting: 1,
    max_jam_mengajar: 24,
    jatah_mapel_x: 14,
    jatah_mapel_xi: 14,
    jatah_mapel_xii: 14,
    fitur_pkl_aktif: false,
    mode_kurikulum: 'dua_sesi',
    jp_menit: 40,
    istirahat_menit: 35,
    jam_mulai_pagi: '07:00',
    jam_mulai_siang: '13:00',
    istirahat_setelah_dua_sesi: 4,
    istirahat_setelah_satu_sesi: 5,
  });

  console.log('Seeder selesai — data simulasi berhasil dibuat');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeder gagal:', err.message);
  process.exit(1);
});
