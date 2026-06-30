-- Migrasi non-destruktif untuk fitur mode kurikulum & daftar mapel per ruangan.
-- Jalankan di phpMyAdmin / MySQL pada database `smk-kurikulum`.

-- 1) Mode kurikulum pada tabel settings (satu_sesi / dua_sesi)
ALTER TABLE `settings`
  ADD COLUMN `mode_kurikulum` ENUM('satu_sesi','dua_sesi') NOT NULL DEFAULT 'dua_sesi'
  COMMENT 'satu_sesi: Sen-Jum 10 JP/hari; dua_sesi: Sen-Sab Pagi/Siang';

-- 2) Daftar mapel yang boleh di sebuah Lab/Bengkel (comma-separated id_mapel)
ALTER TABLE `ruangan`
  ADD COLUMN `id_mapel_list` TEXT DEFAULT NULL
  COMMENT 'Daftar id_mapel yang boleh di ruangan ini (Lab/Bengkel). Kosong = pakai aturan jurusan';
