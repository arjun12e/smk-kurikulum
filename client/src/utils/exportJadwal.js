import * as XLSX from 'xlsx';
import { buildWaktuConfig, rentangWaktu, istirahatSetelah, rentangIstirahat } from './jadwalWaktu';

// Daftarkan semua hari secara permanen agar hari kosong tetap muncul kolomnya
const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function dimensiDari(jadwal) {
  const sSet = new Set();
  let mx = 0;
  jadwal.forEach(j => { sSet.add(j.waktu_shift); if (j.slot_jam > mx) mx = j.slot_jam; });
  return {
    hari: HARI_ORDER, // Gunakan semua hari tanpa memfilter yang ada jadwalnya saja
    shift: ['Pagi', 'Siang'].filter(s => sSet.has(s)),
    maxSlot: mx || 8,
  };
}

function safeSheetName(name) {
  return (String(name).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 28)) || 'Sheet';
}

function appendSheetUnik(wb, ws, name) {
  let nama = safeSheetName(name);
  let i = 2;
  while (wb.SheetNames.includes(nama)) nama = safeSheetName(`${name} ${i++}`);
  XLSX.utils.book_append_sheet(wb, ws, nama);
}

// Membangun grid tabel
function buildAOA(records, dim, mode, cfg, cellText) {
  // Susun Header: Jam | Waktu | Senin | R | Selasa | R | Rabu | R ...
  const header = ['Jam', 'Waktu'];
  dim.hari.forEach(hari => {
    header.push(hari, 'R');
  });
  const aoa = [header];
  const merges = [];

  dim.shift.forEach(shift => {
    for (let slot = 1; slot <= dim.maxSlot; slot++) {
      const w = rentangWaktu(mode, shift, slot, cfg);
      const label = dim.shift.length > 1 ? `${shift[0]}${slot}` : String(slot);
      const row = [label, `${w.mulai}-${w.selesai}`];
      
      dim.hari.forEach(hari => {
        // Cukup cari berdasarkan hari, shift, dan slot. 
        // Karena array 'records' sudah difilter per-guru/per-rombel di fungsi bawah.
        const j = records.find(x => x.hari === hari && x.waktu_shift === shift && x.slot_jam === slot);

        // Jika ketemu masukkan teks mapel, jika tidak biarkan string kosong ''
        row.push(j ? cellText(j) : '');
        
        // Masukkan Nama Ruangan ke kolom 'R' di sebelahnya
        const namaRuangan = j?.Ruangan?.nama_ruangan || (j?.KontrakMengajar?.is_pkl || j?.Rombel?.is_pkl ? 'PKL' : '');
        row.push(namaRuangan);
      });
      aoa.push(row);

      // Logika Gabung baris ISTIRAHAT
      if (istirahatSetelah(mode, shift, slot, cfg)) {
        const ist = rentangIstirahat(mode, shift, cfg);
        const barisIstirahat = ['', `${ist.mulai}-${ist.selesai}`];
        
        barisIstirahat.push('ISTIRAHAT');
        for (let k = 1; k < dim.hari.length * 2; k++) {
          barisIstirahat.push('');
        }
        aoa.push(barisIstirahat);

        const currentBarisIdx = aoa.length - 1;
        merges.push({
          s: { r: currentBarisIdx, c: 2 }, 
          e: { r: currentBarisIdx, c: 2 + (dim.hari.length * 2) - 1 } 
        });
      }
    }
  });

  return { aoa, merges };
}

function sheetDari(records, dim, mode, cfg, cellText) {
  const { aoa, merges } = buildAOA(records, dim, mode, cfg, cellText);
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  const colsConfig = [
    { wch: 6 },  
    { wch: 13 }, 
  ];
  
  dim.hari.forEach(() => {
    colsConfig.push({ wch: 22 }); 
    colsConfig.push({ wch: 6 });  
  });
  
  ws['!cols'] = colsConfig;
  ws['!merges'] = merges;

  return ws;
}

const tglHariIni = () => new Date().toISOString().slice(0, 10);

/**
 * Export jadwal per rombel ke .xlsx.
 */
export function exportRombelExcel(jadwal, rombelList, settings, { rombelId } = {}) {
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const cfg = buildWaktuConfig(settings);
  const dim = dimensiDari(jadwal);
  
  const cellText = j => [
    j.KontrakMengajar?.MataPelajaran?.nama_mapel || '',
    j.KontrakMengajar?.Guru?.nama_guru || '',
  ].filter(Boolean).join('\n');

  const wb = XLSX.utils.book_new();
  const targets = rombelId ? rombelList.filter(r => r.id_rombel === rombelId) : rombelList;
  let count = 0;
  
  targets.forEach(r => {
    // Saring data jadwal khusus rombel ini saja
    const recs = jadwal.filter(j => j.id_rombel === r.id_rombel);
    if (recs.length === 0 && !rombelId) return; 
    
    appendSheetUnik(wb, sheetDari(recs, dim, mode, cfg, cellText), r.nama_rombel);
    count++;
  });
  
  if (count === 0) return false;
  const fname = rombelId ? `Jadwal_${safeSheetName(targets[0]?.nama_rombel)}_${tglHariIni()}.xlsx` : `Jadwal_Semua_Rombel_${tglHariIni()}.xlsx`;
  XLSX.writeFile(wb, fname);
  return true;
}

/**
 * Export jadwal per guru ke .xlsx.
 */
export function exportGuruExcel(jadwal, guruList, settings, { guruId } = {}) {
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const cfg = buildWaktuConfig(settings);
  const dim = dimensiDari(jadwal);
  
  const cellText = j => [
    j.KontrakMengajar?.MataPelajaran?.nama_mapel || '',
    j.Rombel?.nama_rombel || '',
  ].filter(Boolean).join('\n');

  const wb = XLSX.utils.book_new();
  const targets = guruId ? guruList.filter(g => g.id_guru === guruId) : guruList;
  let count = 0;
  
  targets.forEach(g => {
    // Saring data jadwal khusus guru ini saja
    const recs = jadwal.filter(j => j.KontrakMengajar?.id_guru === g.id_guru);
    if (recs.length === 0 && !guruId) return;
    
    appendSheetUnik(wb, sheetDari(recs, dim, mode, cfg, cellText), g.nama_guru);
    count++;
  });
  
  if (count === 0) return false;
  const fname = guruId ? `Jadwal_Guru_${safeSheetName(targets[0]?.nama_guru)}_${tglHariIni()}.xlsx` : `Jadwal_Semua_Guru_${tglHariIni()}.xlsx`;
  XLSX.writeFile(wb, fname);
  return true;
}