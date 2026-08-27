import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { buildWaktuConfig, timelineKontinu, profilKhusus } from '../../utils/jadwalWaktu';
import { exportRombelResmiExcel } from '../../utils/exportJadwalResmi';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const KASTA_COLOR = { PNS: 'bg-blue-100 text-blue-800', GTY: 'bg-green-100 text-green-800', GTT: 'bg-gray-100 text-gray-700', P3K: 'bg-green-100 text-green-800', Honorer: 'bg-gray-100 text-gray-700' };
const SESI_HEADER = { Pagi: 'bg-sky-700', Siang: 'bg-orange-700' };

function cellInfo(j) {
  const pkl = j.KontrakMengajar?.is_pkl || j.Rombel?.is_pkl;
  const tanpaRuangan = !j.id_ruangan;
  let info;
  if (tanpaRuangan && pkl) info = { warna: 'bg-amber-100 text-amber-800 border border-amber-300', ket: '🏢 PKL — di luar sekolah' };
  else if (tanpaRuangan) info = { warna: 'bg-purple-100 text-green-800 border border-green-300', ket: '🏃 Di luar kelas (lapangan)' };
  else info = { warna: KASTA_COLOR[j.KontrakMengajar?.Guru?.status_kepegawaian] || 'bg-gray-100 text-gray-700', ket: j.Ruangan?.nama_ruangan };
  if (j.bentrok?.length) {
    info.warna += ' ring-2 ring-red-500';
    info.bentrok = j.bentrok.join(', ');
  }
  return info;
}

export default function JadwalIndex() {
  const [jadwal, setJadwal] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [filterRombel, setFilterRombel] = useState('');
  const [settings, setSettings] = useState(null);
  const [jadwalAll, setJadwalAll] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [dragBlok, setDragBlok] = useState(false);
  const [dragRow, setDragRow] = useState(null);
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const waktuCfg = buildWaktuConfig(settings);

  // Blok = deretan JP berurutan dari kontrak yang sama, hari & sesi sama.
  const getBlok = (j) => {
    const same = jadwal.filter(x => x.id_kontrak === j.id_kontrak && x.hari === j.hari && x.waktu_shift === j.waktu_shift);
    const bySlot = new Map(same.map(x => [x.slot_jam, x]));
    let lo = j.slot_jam, hi = j.slot_jam;
    while (bySlot.has(lo - 1)) lo--;
    while (bySlot.has(hi + 1)) hi++;
    const blok = [];
    for (let s = lo; s <= hi; s++) blok.push(bySlot.get(s));
    return blok;
  };

  const loadJadwal = () => {
    const params = filterRombel ? { id_rombel: filterRombel } : {};
    api.get('/jadwal', { params }).then(r => setJadwal(r.data));
    api.get('/jadwal').then(r => setJadwalAll(r.data)).catch(() => {});
  };

  useEffect(() => {
    api.get('/rombel').then(r => setRombelList(r.data));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    api.get('/jadwal').then(r => setJadwalAll(r.data)).catch(() => setJadwalAll([]));
  }, []);

  useEffect(() => {
    const params = filterRombel ? { id_rombel: filterRombel } : {};
    api.get('/jadwal', { params }).then(r => setJadwal(r.data));
  }, [filterRombel]);

  // Pindahkan sel/blok (drag & drop) ke (hari, sesi, slot) — langsung tersimpan
  const dropKe = async (hari, shift, slot) => {
    if (!dragRow) return;
    try {
      if (dragBlok) {
        const blok = getBlok(dragRow);
        const mulaiLama = blok[0].slot_jam;
        const updates = blok.map(x => ({
          id_jadwal: x.id_jadwal, hari, waktu_shift: shift,
          slot_jam: slot + (x.slot_jam - mulaiLama),
        }));
        await api.put('/jadwal/pindah-blok', { updates });
      } else {
        await api.put(`/jadwal/${dragRow.id_jadwal}/pindah`, { hari, slot_jam: slot, waktu_shift: shift });
      }
      setDragRow(null);
      loadJadwal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memindahkan');
    }
  };

  const hapusSel = async (id) => {
    if (!confirm('Hapus sel jadwal ini?')) return;
    try { await api.delete(`/jadwal/${id}`); loadJadwal(); }
    catch { toast.error('Gagal menghapus'); }
  };

  const exportExcel = async (rombelId) => {
    if (jadwalAll.length === 0) return toast.error('Belum ada jadwal untuk diexport');
    const t = toast.loading('Menyusun file Excel…');
    try {
      const ok = await exportRombelResmiExcel(jadwalAll, rombelList, settings, { rombelId });
      toast.dismiss(t);
      if (!ok) toast.error('Tidak ada data jadwal');
      else toast.success('Excel format resmi berhasil diunduh');
    } catch (err) {
      toast.dismiss(t);
      toast.error(`Gagal membuat Excel: ${err.message}`);
    }
  };

  const getCell = (hari, shift, slot) => jadwal.filter(j => j.hari === hari && j.waktu_shift === shift && j.slot_jam === slot);

  // Dua sesi: JP 1-8 = Pagi, 9+ = Siang. Satu sesi: semua Pagi.
  const pagiCount = mode === 'dua_sesi' ? 8 : (waktuCfg.total || 14);
  const petaJp = (no) => (no <= pagiCount ? { shift: 'Pagi', slot: no } : { shift: 'Siang', slot: no - pagiCount });
  // JP kontinu tertinggi yang BENAR-BENAR ada di data (agar tidak ada blok tersembunyi).
  const jpDariData = (j) => (mode === 'dua_sesi' && j.waktu_shift === 'Siang') ? pagiCount + j.slot_jam : j.slot_jam;
  const maxJpData = jadwal.reduce((m, j) => Math.max(m, jpDariData(j)), 0);
  const totalJp = Math.max(waktuCfg.total || 14, maxJpData);
  // Timeline SATU HARI kontinu (JP 1..totalJp + istirahat bernama) dari Settings.
  const timeline = timelineKontinu(waktuCfg, totalJp);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Grid Jadwal Optimal</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Rombel</option>
          {rombelList.map(r => <option key={r.id_rombel} value={r.id_rombel}>{r.nama_rombel}</option>)}
        </select>

        <div className="flex gap-2 ml-auto">
          <button onClick={() => setEditMode(e => !e)}
            className={`px-3 py-2 text-sm rounded-lg font-medium ${editMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {editMode ? '✏️ Mode Edit: AKTIF' : '✏️ Edit Manual'}
          </button>
          <button onClick={() => exportExcel(filterRombel || undefined)} disabled={!filterRombel}
            title={filterRombel ? 'Export rombel terpilih' : 'Pilih rombel dulu'}
            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            ⬇ Export Rombel Ini
          </button>
          <button onClick={() => exportExcel(undefined)}
            className="px-3 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800">
            ⬇ Export Semua
          </button>
        </div>
      </div>

      {editMode && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-4 text-xs text-purple-700 flex flex-wrap items-center gap-3">
          <span>✏️ <strong>Mode Edit:</strong> seret sel ke hari/jam/sesi lain (otomatis tersimpan), ✕ untuk hapus. Bisa dipindah antar sesi Pagi↔Siang.</span>
          <span className="inline-flex rounded-lg overflow-hidden border border-purple-300 ml-auto">
            <button onClick={() => setDragBlok(false)}
              className={`px-3 py-1 font-medium ${!dragBlok ? 'bg-purple-600 text-white' : 'bg-white text-purple-700'}`}>Geser 1 Jam</button>
            <button onClick={() => setDragBlok(true)}
              className={`px-3 py-1 font-medium ${dragBlok ? 'bg-purple-600 text-white' : 'bg-white text-purple-700'}`}>Geser 1 Blok</button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Reguler (memakai ruangan)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Di luar kelas (lapangan)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> PKL (di luar sekolah)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white ring-2 ring-red-500" /> ⚠ Bentrok</span>
      </div>

      {Object.values(waktuCfg.khusus || {}).some(p => p?.aktif) && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          🗓 <strong>Jadwal khusus:</strong>{' '}
          {Object.entries(waktuCfg.khusus).filter(([, p]) => p?.aktif)
            .map(([k, p]) => `${k.replace('-', ' ')}${p.label ? ` (${p.label})` : ''} — sampai JP ke-${p.max_jp}`)
            .join(' · ')} <span className="text-amber-600">(sel di atas batas ditandai abu-abu)</span>
        </div>
      )}

      {jadwal.some(j => j.bentrok?.length) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          ⚠ <strong>{jadwal.filter(j => j.bentrok?.length).length} slot bentrok</strong> (ring merah). Coba generate ulang, atau perbaiki manual.
        </div>
      )}

      {jadwal.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">
          Belum ada jadwal. Jalankan Algoritma Genetika terlebih dahulu.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-3 py-3 text-left w-12">Jam</th>
                <th className="px-3 py-3 text-left w-24">Waktu</th>
                {HARI.map(h => <th key={h} className="px-3 py-3 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeline.map((b, bi) => {
                if (b.tipe === 'istirahat') {
                  return (
                    <tr key={`ist-${bi}`} className="bg-yellow-50">
                      <td className="bg-yellow-50" />
                      <td className="px-3 py-1 text-center text-[11px] text-yellow-700 whitespace-nowrap">{b.mulai}–{b.selesai}</td>
                      <td colSpan={HARI.length} className="px-3 py-1 text-center text-[11px] font-semibold text-yellow-700 italic">{b.label} ({b.menit} mnt)</td>
                    </tr>
                  );
                }
                const { no, mulai, selesai } = b;
                const { shift, slot } = petaJp(no);
                return (
                  <tr key={`jp-${bi}`} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-bold text-gray-500 text-center bg-gray-50">{no}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-400 whitespace-nowrap">{mulai}–{selesai}</td>
                    {HARI.map(hari => {
                      // Jadwal khusus: batasi JP pada hari/sesi ini
                      const pk = profilKhusus(waktuCfg, hari, shift);
                      if (pk && slot > (pk.max_jp || 99)) {
                        return (
                          <td key={hari} className="px-2 py-2 align-top min-w-[120px] bg-gray-100 text-center text-gray-300 text-xs"
                            title={`${hari} ${shift}: hanya sampai JP ke-${pk.max_jp}${pk.label ? ` (${pk.label})` : ''}`}>—</td>
                        );
                      }
                      const cells = getCell(hari, shift, slot);
                      return (
                        <td key={hari}
                          className={`px-2 py-2 align-top min-w-[120px] ${editMode ? 'outline-dashed outline-1 outline-purple-200' : ''}`}
                          onDragOver={editMode ? (e => e.preventDefault()) : undefined}
                          onDrop={editMode ? (() => dropKe(hari, shift, slot)) : undefined}>
                          {cells.map(j => {
                            const info = cellInfo(j);
                            return (
                              <div key={j.id_jadwal} className={`rounded p-1.5 mb-1 text-xs relative ${info.warna} ${editMode ? 'cursor-move' : ''}`}
                                draggable={editMode}
                                onDragStart={editMode ? (() => setDragRow(j)) : undefined}
                                title={info.bentrok ? `⚠ Bentrok: ${info.bentrok}` : (editMode ? (dragBlok ? 'Seret seluruh blok' : 'Seret 1 jam') : undefined)}>
                                {editMode && (
                                  <button onClick={() => hapusSel(j.id_jadwal)}
                                    className="absolute top-0.5 right-0.5 text-red-500 hover:text-red-700 text-[11px] leading-none font-bold">✕</button>
                                )}
                                {info.bentrok && <div className="font-bold text-red-600">⚠ Bentrok ({info.bentrok})</div>}
                                <div className="font-medium truncate">{j.KontrakMengajar?.MataPelajaran?.nama_mapel}</div>
                                <div className="opacity-75 truncate">{j.KontrakMengajar?.Guru?.nama_guru}</div>
                                <div className="opacity-60 truncate">{j.Rombel?.nama_rombel} · {info.ket}</div>
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
