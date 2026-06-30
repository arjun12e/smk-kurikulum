import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { rentangWaktu, istirahatSetelah, rentangIstirahat, buildWaktuConfig } from '../../utils/jadwalWaktu';
import { exportRombelExcel } from '../../utils/exportJadwal';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SLOTS = [1, 2, 3, 4, 5,6,7,8];
const KASTA_COLOR = { PNS: 'bg-blue-100 text-blue-800', GTY: 'bg-green-100 text-green-800', GTT: 'bg-gray-100 text-gray-700', P3K: 'bg-green-100 text-green-800', Honorer: 'bg-gray-100 text-gray-700' };

// Tentukan tipe & warna sel berdasarkan kondisi ruangan
function cellInfo(j) {
  const pkl = j.KontrakMengajar?.is_pkl || j.Rombel?.is_pkl;
  const tanpaRuangan = !j.id_ruangan;
  if (tanpaRuangan && pkl) return { warna: 'bg-amber-100 text-amber-800 border border-amber-300', ket: '🏢 PKL — di luar sekolah' };
  if (tanpaRuangan) return { warna: 'bg-purple-100 text-purple-800 border border-purple-300', ket: '📍 JP di luar (tanpa ruangan)' };
  return { warna: KASTA_COLOR[j.KontrakMengajar?.Guru?.status_kepegawaian] || 'bg-gray-100 text-gray-700', ket: j.Ruangan?.nama_ruangan };
}

export default function JadwalIndex() {
  const [jadwal, setJadwal] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [filterRombel, setFilterRombel] = useState('');
  const [filterShift, setFilterShift] = useState('Pagi');
  const [settings, setSettings] = useState(null);
  const [jadwalAll, setJadwalAll] = useState([]);
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const waktuCfg = buildWaktuConfig(settings);

  useEffect(() => {
    api.get('/rombel').then(r => setRombelList(r.data));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
    api.get('/jadwal').then(r => setJadwalAll(r.data)).catch(() => setJadwalAll([]));
  }, []);

  const exportExcel = (rombelId) => {
    if (jadwalAll.length === 0) return toast.error('Belum ada jadwal untuk diexport');
    const ok = exportRombelExcel(jadwalAll, rombelList, settings, { rombelId });
    if (!ok) toast.error('Tidak ada data jadwal');
    else toast.success('Excel berhasil diunduh');
  };

  useEffect(() => {
    const params = {};
    if (filterRombel) params.id_rombel = filterRombel;
    if (filterShift) params.waktu_shift = filterShift;
    api.get('/jadwal', { params }).then(r => setJadwal(r.data));
  }, [filterRombel, filterShift]);

  const getSlot = (hari, slot) => jadwal.filter(j => j.hari === hari && j.slot_jam === slot);

  // Jumlah jam mengikuti mode kurikulum (8 utk dua sesi, sampai 10 utk satu sesi)
  const maxSlot = jadwal.reduce((m, j) => Math.max(m, j.slot_jam), 8);
  const slots = Array.from({ length: maxSlot }, (_, i) => i + 1);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Grid Jadwal Optimal</h2>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterRombel} onChange={e => setFilterRombel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Rombel</option>
          {rombelList.map(r => <option key={r.id_rombel} value={r.id_rombel}>{r.nama_rombel}</option>)}
        </select>
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          {['Pagi', 'Siang'].map(s => (
            <button key={s} onClick={() => setFilterShift(s)}
              className={`px-4 py-2 text-sm ${filterShift === s ? 'bg-[#1e3a5f] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="flex gap-2 ml-auto">
          <button onClick={() => exportExcel(filterRombel || undefined)} disabled={!filterRombel}
            title={filterRombel ? 'Export rombel terpilih' : 'Pilih rombel dulu'}
            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            ⬇ Export Rombel Ini
          </button>
          <button onClick={() => exportExcel(undefined)}
            className="px-3 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800">
            ⬇ Export Semua Rombel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Reguler (memakai ruangan)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> JP di luar (tanpa ruangan)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> PKL (di luar sekolah)</span>
      </div>

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
              {slots.map(slot => {
                const w = rentangWaktu(mode, filterShift, slot, waktuCfg);
                return (
                  <Fragment key={slot}>
                    <tr className="border-t border-gray-100">
                      <td className="px-3 py-2 font-bold text-gray-500 text-center bg-gray-50">{slot}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-400 whitespace-nowrap">{w.mulai}–{w.selesai}</td>
                      {HARI.map(hari => {
                        const cells = getSlot(hari, slot);
                        return (
                          <td key={hari} className="px-2 py-2 align-top min-w-[120px]">
                            {cells.map(j => {
                              const info = cellInfo(j);
                              return (
                                <div key={j.id_jadwal} className={`rounded p-1.5 mb-1 text-xs ${info.warna}`}>
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
                    {istirahatSetelah(mode, filterShift, slot, waktuCfg) && (
                      <tr className="bg-yellow-50">
                        <td className="bg-yellow-50" />
                        <td className="px-3 py-1 text-center text-[11px] text-yellow-700 whitespace-nowrap">
                          {rentangIstirahat(mode, filterShift, waktuCfg).mulai}–{rentangIstirahat(mode, filterShift, waktuCfg).selesai}
                        </td>
                        <td colSpan={HARI.length} className="px-3 py-1 text-center text-[11px] font-medium text-yellow-700">
                          ☕ Istirahat ({waktuCfg.istirahatMenit} menit)
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
