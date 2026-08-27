// Export Excel FORMAT RESMI sekolah (per guru) — meniru lembar "Jadwal Pelajaran"
// SMK Pasundan 2 Bandung: kop + logo, identitas guru, grid Pagi & Siang dengan
// baris MBG/istirahat, tabel jadwal khusus (upacara/sholat jumat), dan blok
// tanda tangan kepala sekolah. Dibangun dengan exceljs (mendukung gambar & style).
import { buildWaktuConfig, timelineKontinu, profilKhusus, rentangWaktu, istirahatSetelah, rentangIstirahat } from './jadwalWaktu.js';

// ===== Identitas sekolah (ubah di sini bila ada perubahan) =====
const KOP = {
  judulKeahlian: 'KOMPETENSI KEAHLIAN',
  keahlian: [
    'TEKNIK PEMESINAN (TERAKREDITASI A)   TEKNIK KENDARAAN RINGAN OTOMOTIF (TERAKREDITASI A)',
    'TEKNIK AUDIO VIDEO (TERAKREDITASI A)   TEKNIK KOMPUTER JARINGAN (TERAKREDITASI A)',
    'TEKNIK DAN BISNIS SEPEDA MOTOR (TERAKREDITASI A)',
  ],
  alamat: 'Jl. Pelita Karya 1 no 2 Telp/Fax (022) 6034059 Maleber Barat - Bandung 40184',
  web: 'Web Site : http://www.smkpasundan2bdg.org   e-mail : smkpas2bdg@yahoo.com',
};
const KEPALA_SEKOLAH = { jabatan: 'Kepala Sekolah,', nama: 'Umar Khatob, S.Pd, M.Si.', nrks: 'NRKS. 21023L0130260141242030' };
const CATATAN = ['1. Mulai berlaku tanggal :  Juli', '2. Bel dibunyikan tiap 2 jam pelajaran'];

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAVY = 'FF1F3864';
const ABU = 'FFD9D9D9';
const KUNING = 'FFFFF2CC';

const tipis = { style: 'thin', color: { argb: 'FF000000' } };
const BORDER = { top: tipis, left: tipis, bottom: tipis, right: tipis };

function tahunPelajaran() {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() + 1 >= 7 ? `${y} / ${y + 1}` : `${y - 1} / ${y}`;
}

// Isi sel jadwal. untuk='guru' → baris kedua nama rombel; untuk='rombel' → nama guru.
function isiSel(j, untuk = 'guru') {
  if (!j) return { teks: '', ruang: '' };
  const mapel = j.KontrakMengajar?.MataPelajaran?.nama_mapel || '';
  const baris2 = untuk === 'rombel'
    ? (j.KontrakMengajar?.Guru?.nama_guru || '')
    : (j.Rombel?.nama_rombel || '');
  const pkl = j.KontrakMengajar?.is_pkl || j.Rombel?.is_pkl;
  const ruang = j.Ruangan?.nama_ruangan || (pkl ? 'PKL' : (j.id_ruangan ? '' : 'Lap'));
  return { teks: `${mapel}\n${baris2}`, ruang };
}

// Satu sheet resmi. identitas = { label: 'NAMA GURU'|'NAMA ROMBEL', nilai }.
function buildSheetResmi(wb, ws, logoId, records, identitas, settings, untuk = 'guru') {
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const cfg = buildWaktuConfig(settings);
  const at = (hari, shift, slot) => records.find(j => j.hari === hari && j.waktu_shift === shift && j.slot_jam === slot);

  // Kolom: A=NO, B=WAKTU, lalu (hari + R) × 6 → total 14 kolom (A..N)
  ws.columns = [
    { width: 4 }, { width: 12 },
    ...HARI.flatMap(() => [{ width: 17 }, { width: 7 }]),
  ];
  const LAST_COL = 2 + HARI.length * 2; // 14
  const merge = (r1, c1, r2, c2) => ws.mergeCells(r1, c1, r2, c2);
  const set = (r, c, v, opts = {}) => {
    const cell = ws.getCell(r, c);
    cell.value = v;
    cell.font = { name: 'Arial', size: 8, ...opts.font };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, ...opts.align };
    if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    if (opts.border !== false) cell.border = opts.border || undefined;
    return cell;
  };

  // ===== KOP =====
  let r = 1;
  merge(r, 3, r, LAST_COL - 1);
  set(r, 3, KOP.judulKeahlian, { font: { size: 9, bold: true }, border: false });
  KOP.keahlian.forEach(line => {
    r++;
    merge(r, 3, r, LAST_COL - 1);
    set(r, 3, line, { font: { size: 7.5, bold: true, color: { argb: 'FF7B2E00' } }, border: false });
  });
  r++;
  merge(r, 3, r, LAST_COL - 1);
  set(r, 3, KOP.alamat, { font: { size: 7.5 }, border: false });
  r++;
  merge(r, 3, r, LAST_COL - 1);
  set(r, 3, KOP.web, { font: { size: 7.5 }, border: false });
  // garis bawah kop
  for (let c = 1; c <= LAST_COL; c++) {
    ws.getCell(r, c).border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } };
  }
  if (logoId != null) {
    ws.addImage(logoId, { tl: { col: 0.2, row: 0.2 }, ext: { width: 90, height: 90 } });
  }

  // ===== JUDUL + IDENTITAS GURU =====
  r += 2;
  const rJudul = r;
  merge(r, 1, r, 8); set(r, 1, 'JADWAL PELAJARAN', { font: { size: 10, bold: true }, border: false });
  merge(r + 1, 1, r + 1, 8); set(r + 1, 1, 'SMK PASUNDAN 2 BANDUNG', { font: { size: 10, bold: true }, border: false });
  merge(r + 2, 1, r + 2, 8); set(r + 2, 1, `TAHUN PELAJARAN ${tahunPelajaran()}`, { font: { size: 10, bold: true }, border: false });
  set(rJudul, 10, identitas.label, { align: { horizontal: 'left' }, border: false });
  set(rJudul, 12, `:  ${identitas.nilai || ''}`, { align: { horizontal: 'left' }, font: { bold: true }, border: false });
  merge(rJudul, 12, rJudul, LAST_COL);
  set(rJudul + 1, 10, 'JUMLAH JAM', { align: { horizontal: 'left' }, border: false });
  set(rJudul + 1, 12, `:  ${records.length}  Jam`, { align: { horizontal: 'left' }, border: false });
  merge(rJudul + 1, 12, rJudul + 1, LAST_COL);
  r += 4;

  // ===== GRID PAGI & SIANG =====
  // Timeline kontinu 1..14 dengan istirahat bernama (MBG, Sholat, dst).
  const rows = timelineKontinu(cfg, cfg.total || 14);
  const headerGrid = (row) => {
    set(row, 1, 'NO', { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY, border: BORDER });
    set(row, 2, 'WAKTU', { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY, border: BORDER });
    HARI.forEach((h, i) => {
      set(row, 3 + i * 2, h.toUpperCase(), { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY, border: BORDER });
      set(row, 4 + i * 2, 'R', { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: NAVY, border: BORDER });
    });
  };

  let headerPagiDitulis = false;
  let headerSiangDitulis = false;
  for (const row of rows) {
    if (row.tipe === 'jp') {
      const shift = row.no <= 8 ? 'Pagi' : 'Siang';
      if (shift === 'Pagi' && !headerPagiDitulis) { headerGrid(r); r++; headerPagiDitulis = true; }
      if (shift === 'Siang' && !headerSiangDitulis) { headerGrid(r); r++; headerSiangDitulis = true; }
      const slot = shift === 'Pagi' ? row.no : row.no - 8;
      set(r, 1, slot, { border: BORDER });
      set(r, 2, `${row.mulai} - ${row.selesai}`, { border: BORDER });
      HARI.forEach((hari, i) => {
        const pk = profilKhusus(cfg, hari, shift);
        if (pk && slot > (pk.max_jp || 99)) {
          set(r, 3 + i * 2, '', { fill: ABU, border: BORDER });
          set(r, 4 + i * 2, '', { fill: ABU, border: BORDER });
          return;
        }
        const { teks, ruang } = isiSel(at(hari, shift, slot), untuk);
        set(r, 3 + i * 2, teks, { font: { size: 7.5 }, border: BORDER });
        set(r, 4 + i * 2, ruang, { font: { size: 7 }, border: BORDER });
      });
      ws.getRow(r).height = 24;
      r++;
    } else {
      // Baris istirahat bernama (MBG / Istirahat / Sholat) — merge lebar hari
      set(r, 1, '', { border: BORDER });
      set(r, 2, `${row.mulai} - ${row.selesai}`, { font: { bold: true }, fill: KUNING, border: BORDER });
      merge(r, 3, r, LAST_COL);
      set(r, 3, (row.label || 'ISTIRAHAT').toUpperCase(), { font: { bold: true }, fill: KUNING, border: BORDER });
      r++;
    }
  }

  // ===== TABEL JADWAL KHUSUS (Senin upacara, Jumat sholat, dst.) =====
  r += 1;
  const khususAktif = Object.entries(cfg.khusus || {}).filter(([, p]) => p?.aktif);

  // Lebar kolom fisik sheet berselang-seling (hari 17 / R 7). Agar kolom ISI
  // tabel khusus tidak pernah jatuh di kolom sempit, WAKTU & ISI di-MERGE
  // melintasi beberapa kolom fisik sampai total lebarnya cukup.
  const lebarKolom = (c) => (ws.columns[c - 1] && ws.columns[c - 1].width) || 9;
  const rentangLebar = (mulai, target) => {
    let akhir = mulai;
    let tot = lebarKolom(mulai);
    while (tot < target && akhir < LAST_COL) { akhir++; tot += lebarKolom(akhir); }
    return akhir;
  };
  const tataLetak = (mulai) => {
    const colNo = mulai;
    const colWaktu = colNo + 1;
    const colWaktuEnd = rentangLebar(colWaktu, 11);   // WAKTU minimal ~11
    const colIsi = colWaktuEnd + 1;
    const colIsiEnd = rentangLebar(colIsi, 16);       // ISI minimal ~16
    const colR = colIsiEnd + 1;
    return { colNo, colWaktu, colWaktuEnd, colIsi, colIsiEnd, colR };
  };
  // Merge horizontal + nilai di sel pertama; border/fill diterapkan ke SEMUA sel
  // dalam rentang agar garis tepi merge utuh.
  const setMerge = (row, c1, c2, v, opts = {}) => {
    if (c2 > c1) merge(row, c1, row, c2);
    set(row, c1, v, opts);
    for (let c = c1 + 1; c <= c2; c++) {
      const cell = ws.getCell(row, c);
      if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
      if (opts.border !== false) cell.border = opts.border || BORDER;
    }
  };

  const C_TTD = LAST_COL - 1; // blok tanda tangan menempati kolom ini ke kanan
  const rKhususTop = r;
  let bandTop = r;
  let rKhususMax = r;
  let cFis = 1;
  for (const [key, p] of khususAktif) {
    const [hari, shift] = key.split('-');
    let L = tataLetak(cFis);
    if (L.colR >= C_TTD) { cFis = 1; bandTop = rKhususMax + 1; L = tataLetak(1); } // pindah band bawah
    let rr = bandTop;
    setMerge(rr, L.colNo, L.colR, `Jadwal Khusus Hari ${hari} ${shift}`, { font: { bold: true }, fill: ABU, border: BORDER });
    rr++;
    // Baris 0: kegiatan khusus (upacara/sholat) sebelum jam pelajaran dimulai
    const wAwal = shift === 'Siang' ? cfg.jamMulaiSiang : cfg.jamMulaiPagi;
    set(rr, L.colNo, 0, { border: BORDER });
    setMerge(rr, L.colWaktu, L.colWaktuEnd, `${wAwal} - ${p.jam_mulai || ''}`, { border: BORDER });
    setMerge(rr, L.colIsi, L.colR, (p.label || 'KEGIATAN KHUSUS').toUpperCase(), { font: { bold: true }, border: BORDER });
    rr++;
    const maxJp = p.max_jp || 8;
    for (let slot = 1; slot <= maxJp; slot++) {
      const w = rentangWaktu(mode, shift, slot, cfg, hari);
      const { teks, ruang } = isiSel(at(hari, shift, slot), untuk);
      set(rr, L.colNo, slot, { border: BORDER });
      setMerge(rr, L.colWaktu, L.colWaktuEnd, `${w.mulai} - ${w.selesai}`, { border: BORDER });
      setMerge(rr, L.colIsi, L.colIsiEnd, teks, { font: { size: 7.5 }, border: BORDER });
      set(rr, L.colR, ruang, { font: { size: 7 }, border: BORDER });
      rr++;
      if (istirahatSetelah(mode, shift, slot, cfg, hari)) {
        const wi = rentangIstirahat(mode, shift, cfg, hari);
        set(rr, L.colNo, '', { border: BORDER });
        setMerge(rr, L.colWaktu, L.colWaktuEnd, `${wi.mulai} - ${wi.selesai}`, { font: { bold: true }, fill: KUNING, border: BORDER });
        setMerge(rr, L.colIsi, L.colR, 'ISTIRAHAT', { font: { bold: true }, fill: KUNING, border: BORDER });
        rr++;
      }
    }
    rKhususMax = Math.max(rKhususMax, rr);
    cFis = L.colR + 2; // satu kolom jarak antar tabel
  }

  // ===== TANDA TANGAN KEPALA SEKOLAH (kanan) =====
  let rTtd = rKhususTop + 1;
  const cTtd = LAST_COL - 1;
  merge(rTtd, cTtd, rTtd, LAST_COL);
  set(rTtd, cTtd, KEPALA_SEKOLAH.jabatan, { align: { horizontal: 'left' }, border: false });
  rTtd += 4;
  merge(rTtd, cTtd, rTtd, LAST_COL);
  set(rTtd, cTtd, KEPALA_SEKOLAH.nama, { align: { horizontal: 'left' }, font: { bold: true, underline: true }, border: false });
  merge(rTtd + 1, cTtd, rTtd + 1, LAST_COL);
  set(rTtd + 1, cTtd, KEPALA_SEKOLAH.nrks, { align: { horizontal: 'left' }, border: false });

  // ===== CATATAN KAKI =====
  let rCat = Math.max(rKhususMax, rTtd + 2) + 1;
  const tahun = tahunPelajaran().split(' ')[0];
  [`${CATATAN[0]} ${tahun}`, CATATAN[1]].forEach(c => {
    merge(rCat, 1, rCat, 8);
    set(rCat, 1, c, { align: { horizontal: 'left' }, font: { size: 7.5 }, border: false });
    rCat++;
  });

  // Cetak: A4 landscape, muat satu halaman lebar
  ws.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
}

function safeSheetName(name) {
  return (String(name).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 28)) || 'Sheet';
}

/**
 * Susun workbook format resmi (tanpa menyentuh API browser) — juga dipakai
 * untuk pengujian di Node. logoBuffer opsional (ArrayBuffer PNG).
 */
export async function buatWorkbookGuruResmi(jadwal, guruList, settings, { guruId, logoBuffer } = {}) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const logoId = logoBuffer ? wb.addImage({ buffer: logoBuffer, extension: 'png' }) : null;

  const targets = guruId ? guruList.filter(g => g.id_guru === guruId) : guruList;
  let count = 0;
  const dipakaiNama = new Set();
  for (const g of targets) {
    const recs = jadwal.filter(j => j.KontrakMengajar?.id_guru === g.id_guru);
    if (recs.length === 0 && !guruId) continue;
    let nama = safeSheetName(g.nama_guru);
    let i = 2;
    while (dipakaiNama.has(nama)) nama = safeSheetName(`${g.nama_guru} ${i++}`);
    dipakaiNama.add(nama);
    const ws = wb.addWorksheet(nama);
    buildSheetResmi(wb, ws, logoId, recs, { label: 'NAMA GURU', nilai: g.nama_guru }, settings, 'guru');
    count++;
  }
  const tgl = new Date().toISOString().slice(0, 10);
  const fname = guruId
    ? `Jadwal_Guru_${safeSheetName(targets[0]?.nama_guru)}_${tgl}.xlsx`
    : `Jadwal_Semua_Guru_${tgl}.xlsx`;
  return { wb, count, fname };
}

/**
 * Susun workbook format resmi PER ROMBEL (satu sheet per rombel).
 * Sel berisi mapel + nama guru; identitas header = NAMA ROMBEL.
 */
export async function buatWorkbookRombelResmi(jadwal, rombelList, settings, { rombelId, logoBuffer } = {}) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const logoId = logoBuffer ? wb.addImage({ buffer: logoBuffer, extension: 'png' }) : null;

  const targets = rombelId ? rombelList.filter(x => x.id_rombel === rombelId) : rombelList;
  let count = 0;
  const dipakaiNama = new Set();
  for (const rb of targets) {
    const recs = jadwal.filter(j => j.id_rombel === rb.id_rombel);
    if (recs.length === 0 && !rombelId) continue;
    let nama = safeSheetName(rb.nama_rombel);
    let i = 2;
    while (dipakaiNama.has(nama)) nama = safeSheetName(`${rb.nama_rombel} ${i++}`);
    dipakaiNama.add(nama);
    const ws = wb.addWorksheet(nama);
    buildSheetResmi(wb, ws, logoId, recs, { label: 'NAMA ROMBEL', nilai: rb.nama_rombel }, settings, 'rombel');
    count++;
  }
  const tgl = new Date().toISOString().slice(0, 10);
  const fname = rombelId
    ? `Jadwal_${safeSheetName(targets[0]?.nama_rombel)}_${tgl}.xlsx`
    : `Jadwal_Semua_Rombel_${tgl}.xlsx`;
  return { wb, count, fname };
}

// Muat logo sekolah dari public/ — dilewati bila gagal.
async function muatLogo() {
  try {
    const res = await fetch('/logo-pas1.png');
    if (res.ok) return await res.arrayBuffer();
  } catch { /* tanpa logo */ }
  return null;
}

// Unduh workbook sebagai file .xlsx di browser.
async function unduhWorkbook(wb, fname) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Export jadwal per guru dalam FORMAT RESMI (.xlsx, satu sheet per guru).
 */
export async function exportGuruResmiExcel(jadwal, guruList, settings, { guruId } = {}) {
  const logoBuffer = await muatLogo();
  const { wb, count, fname } = await buatWorkbookGuruResmi(jadwal, guruList, settings, { guruId, logoBuffer });
  if (count === 0) return false;
  await unduhWorkbook(wb, fname);
  return true;
}

/**
 * Export jadwal per rombel dalam FORMAT RESMI (.xlsx, satu sheet per rombel).
 */
export async function exportRombelResmiExcel(jadwal, rombelList, settings, { rombelId } = {}) {
  const logoBuffer = await muatLogo();
  const { wb, count, fname } = await buatWorkbookRombelResmi(jadwal, rombelList, settings, { rombelId, logoBuffer });
  if (count === 0) return false;
  await unduhWorkbook(wb, fname);
  return true;
}
