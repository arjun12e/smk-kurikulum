-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 15, 2026 at 03:43 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smk-kurikulum`
--

-- --------------------------------------------------------

--
-- Table structure for table `mata_pelajaran`
--

CREATE TABLE `mata_pelajaran` (
  `id_mapel` varchar(50) NOT NULL,
  `nama_mapel` varchar(150) NOT NULL,
  `kategori_mapel` enum('Produktif','Umum','Pelajaran Kejuruan','Muatan Lokal','Pelajaran Pilihan') NOT NULL,
  `tingkat` set('X','XI','XII') DEFAULT NULL COMMENT 'Tingkat/kelas yang mengajar mata pelajaran ini',
  `jenis_guru` varchar(100) DEFAULT NULL COMMENT 'Comma-separated jenis guru yang cocok mengajar (Jurusan, Umum)',
  `id_jurusan` varchar(50) DEFAULT NULL COMMENT 'Jurusan pemilik mapel produktif (penempatan Lab/Bengkel). NULL = ikut jurusan rombel',
  `alokasi_per_minggu` int(11) DEFAULT 0,
  `jp_diluar` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `mata_pelajaran`
--

INSERT INTO `mata_pelajaran` (`id_mapel`, `nama_mapel`, `kategori_mapel`, `tingkat`, `jenis_guru`, `id_jurusan`, `alokasi_per_minggu`, `jp_diluar`) VALUES
('MP001', 'Pendidikan Agama Islam', 'Umum', 'X', 'Umum', NULL, 3, 1),
('MP002', 'Pendidikan Pancasila', 'Umum', 'X', 'Umum', NULL, 3, 0),
('MP003', 'Bahasa Indonesia', 'Umum', 'X', 'Umum', NULL, 4, 1),
('MP004', 'PJOK', 'Umum', 'X', 'Umum', NULL, 3, 3),
('MP005', 'Sejarah', 'Umum', 'XI', 'Umum', NULL, 2, 0),
('MP006', 'Seni Budaya (Seni Musik)', 'Umum', 'XI', 'Umum', NULL, 2, 0),
('MP007', 'Matematika', 'Pelajaran Kejuruan', 'X', 'Umum', NULL, 4, 0),
('MP008', 'Bahasa Inggris', 'Pelajaran Kejuruan', 'XI', 'Umum', NULL, 4, 1),
('MP009', 'Informatika', 'Pelajaran Kejuruan', 'XI', 'Jurusan', NULL, 4, 2),
('MP010', 'Projek Ilmu Pengetahuan Alam dan Sosial', 'Pelajaran Kejuruan', 'X', 'Umum', NULL, 6, 3),
('MP011', 'Bahasa Jepang', 'Pelajaran Kejuruan', 'XI', 'Jurusan', NULL, 2, 0),
('MP012', 'Dasar Dasar Program Keahlian (TE)', 'Produktif', 'X', 'Jurusan', 'TAV', 12, 0),
('MP013', 'Dasar Dasar Program Keahlian (TM)', 'Produktif', 'X', 'Jurusan', 'TPM', 12, 0),
('MP014', 'Dasar Dasar Program Keahlian (TO)', 'Produktif', 'X', 'Jurusan', 'TKR', 12, 0),
('MP015', 'Dasar Dasar Program Keahlian (TJKT)', 'Produktif', 'X', 'Jurusan', 'TKJ', 12, 0),
('MP016', 'Projek Kreatif Kewirausahaan (TAV)', 'Produktif', 'XI,XII', 'Jurusan', 'TAV', 5, 0),
('MP017', 'Projek Kreatif Kewirausahaan (TPM)', 'Produktif', 'XI,XII', 'Jurusan', 'TPM', 5, 0),
('MP018', 'Projek Kreatif Kewirausahaan (TKR)', 'Produktif', 'XI,XII', 'Jurusan', 'TKR', 5, 0),
('MP019', 'Projek Kreatif Kewirausahaan (TKJ)', 'Produktif', 'XI,XII', 'Jurusan', 'TKJ', 5, 0),
('MP020', 'Projek Kreatif Kewirausahaan (TSM)', 'Produktif', 'XI,XII', 'Jurusan', 'TSM', 5, 0),
('MP021', 'Mata Pelajaran Pilihan (TAV)', 'Produktif', 'XI,XII', 'Jurusan', 'TAV', 4, 0),
('MP022', 'Mata Pelajaran Pilihan (TPM)', 'Produktif', 'XI,XII', 'Jurusan', 'TPM', 4, 0),
('MP023', 'Mata Pelajaran Pilihan (TKR)', 'Produktif', 'XI,XII', 'Jurusan', 'TKR', 4, 0),
('MP024', 'Mata Pelajaran Pilihan (TKJ)', 'Produktif', 'XI,XII', 'Jurusan', 'TKJ', 4, 0),
('MP025', 'Mata Pelajaran Pilihan (TSM)', 'Produktif', 'XI,XII', 'Jurusan', 'TSM', 4, 0),
('MP026', 'Kosentrasi Keahlian (TAV)', 'Produktif', 'XII', 'Jurusan', 'TAV', 18, 0),
('MP027', 'Kosentrasi Keahlian (TPM)', 'Produktif', 'XII', 'Jurusan', 'TPM', 18, 0),
('MP028', 'Kosentrasi Keahlian (TKR)', 'Produktif', 'XII', 'Jurusan', 'TKR', 18, 0),
('MP029', 'Kosentrasi Keahlian (TKJ)', 'Produktif', 'XII', 'Jurusan', 'TKJ', 18, 0),
('MP030', 'Kosentrasi Keahlian (TSM)', 'Produktif', 'XII', 'Jurusan', 'TSM', 18, 0),
('MP031', 'Muatan Lokal Sunda', 'Muatan Lokal', 'X', 'Umum', NULL, 2, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `mata_pelajaran`
--
ALTER TABLE `mata_pelajaran`
  ADD PRIMARY KEY (`id_mapel`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
