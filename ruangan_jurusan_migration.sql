-- Migrasi non-destruktif: menambah kolom id_jurusan pada tabel `ruangan`
-- Jalankan di phpMyAdmin / MySQL pada database `smk-kurikulum`.
-- Aman untuk data yang sudah ada (tidak menghapus baris apa pun).

ALTER TABLE `ruangan`
  ADD COLUMN `id_jurusan` VARCHAR(50) DEFAULT NULL
  COMMENT 'Jurusan pemilik ruangan praktik (Lab/Bengkel). NULL = ruangan teori/umum';

-- Set jurusan untuk Lab/Bengkel sesuai data seed bawaan.
-- Sesuaikan jika ID ruangan Anda berbeda.
UPDATE `ruangan` SET `id_jurusan` = 'TAV' WHERE `id_ruangan` = 'RU022';                       -- Lab TAV
UPDATE `ruangan` SET `id_jurusan` = 'TKJ' WHERE `id_ruangan` IN
  ('RU023','RU024','RU025','RU026','RU027','RU028','RU029');                                    -- Lab 1..7 TKJ
UPDATE `ruangan` SET `id_jurusan` = 'TSM' WHERE `id_ruangan` = 'RU030';                         -- Bengkel TSM
UPDATE `ruangan` SET `id_jurusan` = 'TKR' WHERE `id_ruangan` = 'RU031';                         -- Bengkel TKR
UPDATE `ruangan` SET `id_jurusan` = 'TPM' WHERE `id_ruangan` = 'RU032';                         -- Bengkel TPM

-- Pastikan ruangan Teori tidak terikat jurusan.
UPDATE `ruangan` SET `id_jurusan` = NULL WHERE `jenis_ruangan` = 'Teori';

-- ============================================================
-- Tambah kolom id_jurusan pada tabel `mata_pelajaran`.
-- Penjadwalan memakai jurusan mapel ini lebih dulu, baru jurusan rombel.
-- ============================================================

ALTER TABLE `mata_pelajaran`
  ADD COLUMN `id_jurusan` VARCHAR(50) DEFAULT NULL
  COMMENT 'Jurusan pemilik mapel produktif. NULL = ikut jurusan rombel';

UPDATE `mata_pelajaran` SET `id_jurusan` = 'TAV' WHERE `id_mapel` IN ('MP012','MP016','MP021','MP026'); -- TE, Projek/Pilihan/Konsentrasi TAV
UPDATE `mata_pelajaran` SET `id_jurusan` = 'TPM' WHERE `id_mapel` IN ('MP013','MP017','MP022','MP027'); -- TM, ... TPM
UPDATE `mata_pelajaran` SET `id_jurusan` = 'TKR' WHERE `id_mapel` IN ('MP014','MP018','MP023','MP028'); -- TO, ... TKR
UPDATE `mata_pelajaran` SET `id_jurusan` = 'TKJ' WHERE `id_mapel` IN ('MP015','MP019','MP024','MP029'); -- TJKT, ... TKJ
UPDATE `mata_pelajaran` SET `id_jurusan` = 'TSM' WHERE `id_mapel` IN ('MP020','MP025','MP030');         -- ... TSM

-- Hanya mapel produktif yang terikat jurusan.
UPDATE `mata_pelajaran` SET `id_jurusan` = NULL WHERE `kategori_mapel` <> 'Produktif';
