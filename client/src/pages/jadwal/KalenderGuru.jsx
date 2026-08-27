import { useEffect, useState, useMemo, Fragment } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { rentangWaktu, istirahatSetelah, rentangIstirahat, buildWaktuConfig, profilKhusus } from '../../utils/jadwalWaktu';
import { exportGuruResmiExcel } from '../../utils/exportJadwalResmi';

const HARI_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

function cellStyle(j) {
  const pkl = j.KontrakMengajar?.is_pkl || j.Rombel?.is_pkl;
  let st;
  if (!j.id_ruangan && pkl) st = { warna: 'bg-amber-100 text-amber-800', ket: 'PKL' };
  else if (!j.id_ruangan) st = { warna: 'bg-green-100 text-green-800', ket: 'Lapangan' };
  else st = { warna: 'bg-blue-50 text-blue-800', ket: j.Ruangan?.nama_ruangan || '' };
  if (j.bentrok?.length) {
    st.warna += ' ring-2 ring-red-500';
    st.ket = `⚠ ${j.bentrok.join(',')} · ${st.ket}`;
  }
  return st;
}

export default function KalenderGuru() {
  const [guruList, setGuruList] = useState([]);
  const [jadwal, setJadwal] = useState([]);
  const [idGuru, setIdGuru] = useState('');
  const [settings, setSettings] = useState(null);
  const mode = settings?.mode_kurikulum || 'dua_sesi';
  const waktuCfg = buildWaktuConfig(settings);

  useEffect(() => {
    api.get('/guru').then(r => setGuruList(r.data)).catch(() => setGuruList([]));
    api.get('/jadwal').then(r => setJadwal(r.data)).catch(() => setJadwal([]));
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  // Hari & slot yang benar-benar dipakai (mengikuti mode kurikulum aktif)
  const { hariAda, shiftAda, maxSlot } = useMemo(() => {
    const hSet = new Set(), sSet = new Set();
    let mx = 0;
    jadwal.forEach(j => { hSet.add(j.hari); sSet.add(j.waktu_shift); if (j.slot_jam > mx) mx = j.slot_jam; });
    return {
      hariAda: HARI_ORDER.filter(h => hSet.has(h)),
      shiftAda: ['Pagi', 'Siang'].filter(s => sSet.has(s)),
      maxSlot: mx || 8,
    };
  }, [jadwal]);

  const jadwalGuru = useMemo(
    () => jadwal.filter(j => j.KontrakMengajar?.id_guru === idGuru),
    [jadwal, idGuru]
  );

  const at = (hari, shift, slot) =>
    jadwalGuru.find(j => j.hari === hari && j.waktu_shift === shift && j.slot_jam === slot);

  const totalJp = jadwalGuru.length;
  const guru = guruList.find(g => g.id_guru === idGuru);

  const exportExcel = async (guruId) => {
    if (jadwal.length === 0) return toast.error('Belum ada jadwal untuk diexport');
    const t = toast.loading('Menyusun file Excel…');
    try {
      const ok = await exportGuruResmiExcel(jadwal, guruList, settings, { guruId });
      toast.dismiss(t);
      if (!ok) toast.error('Tidak ada data jadwal');
      else toast.success('Excel format resmi berhasil diunduh');
    } catch (err) {
      toast.dismiss(t);
      toast.error(`Gagal membuat Excel: ${err.message}`);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Kalender Akademik Guru</h2>
      <p className="text-sm text-gray-500 mb-4">Jadwal mengajar mingguan per guru.</p>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <select value={idGuru} onChange={e => setIdGuru(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[260px]">
          <option value="">— Pilih guru —</option>
          {guruList.map(g => <option key={g.id_guru} value={g.id_guru}>{g.nama_guru}</option>)}
        </select>
        {idGuru && (
          <span className="text-sm text-gray-600">
            Total <strong>{totalJp} JP/minggu</strong>
            {guru?.total_jam_mengajar ? <> · jatah {guru.total_jam_mengajar} JP
              {totalJp > guru.total_jam_mengajar && <span className="text-red-600 font-semibold"> ⚠️ melebihi</span>}</> : null}
          </span>
        )}
        <div className="flex gap-2 ml-auto">
          <button onClick={() => exportExcel(idGuru || undefined)} disabled={!idGuru}
            title={idGuru ? 'Export guru terpilih' : 'Pilih guru dulu'}
            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
            ⬇ Export Guru Ini
          </button>
          <button onClick={() => exportExcel(undefined)}
            className="px-3 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800">
            ⬇ Export Semua Guru
          </button>
        </div>
      </div>

      {Object.values(waktuCfg.khusus || {}).some(p => p?.aktif) && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          🗓 <strong>Jadwal khusus:</strong>{' '}
          {Object.entries(waktuCfg.khusus).filter(([, p]) => p?.aktif)
            .map(([k, p]) => `${k.replace('-', ' ')}${p.label ? ` (${p.label})` : ''} — sampai JP ke-${p.max_jp}`)
            .join(' · ')}
        </div>
      )}

      {!idGuru ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Pilih guru untuk melihat kalendernya.</div>
      ) : jadwal.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Belum ada jadwal. Jalankan Algoritma Genetika dulu.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-2 py-2 w-12 sticky left-0 bg-[#1e3a5f]">Jam</th>
                <th className="px-2 py-2 w-24">Waktu</th>
                {hariAda.map(h => <th key={h} className="px-2 py-2 text-center min-w-[130px]">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shiftAda.map(shift => (
                Array.from({ length: maxSlot }, (_, i) => i + 1).map(slot => {
                  const w = rentangWaktu(mode, shift, slot, waktuCfg);
                  return (
                    <Fragment key={`${shift}-${slot}`}>
                      <tr className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-center bg-gray-50 font-medium text-gray-500 sticky left-0">
                          {shiftAda.length > 1 ? `${shift[0]}${slot}` : slot}
                        </td>
                        <td className="px-2 py-1.5 text-center text-gray-400 whitespace-nowrap">{w.mulai}–{w.selesai}</td>
                        {hariAda.map(hari => {
                          const pk = profilKhusus(waktuCfg, hari, shift);
                          if (pk && slot > (pk.max_jp || 99)) {
                            return <td key={hari} className="px-1 py-1 bg-gray-50 text-center text-gray-300"
                              title={`${hari} ${shift} hanya ${pk.max_jp} JP (${pk.label})`}>—</td>;
                          }
                          const j = at(hari, shift, slot);
                          const wKhusus = pk ? rentangWaktu(mode, shift, slot, waktuCfg, hari) : null;
                          if (!j) return (
                            <td key={hari} className="px-1 py-1 align-top">
                              {wKhusus && <div className="text-[9px] text-gray-300 text-center">{wKhusus.mulai}–{wKhusus.selesai}</div>}
                            </td>
                          );
                          const st = cellStyle(j);
                          return (
                            <td key={hari} className="px-1 py-1 align-top">
                              <div className={`rounded p-1 ${st.warna}`}>
                                {wKhusus && <div className="text-[9px] font-semibold opacity-70">{wKhusus.mulai}–{wKhusus.selesai}</div>}
                                <div className="font-medium truncate">{j.KontrakMengajar?.MataPelajaran?.nama_mapel}</div>
                                <div className="opacity-70 truncate">{j.Rombel?.nama_rombel} · {st.ket}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                      {istirahatSetelah(mode, shift, slot, waktuCfg) && (
                        <tr className="bg-yellow-50">
                          <td className="sticky left-0 bg-yellow-50" />
                          <td className="px-2 py-1 text-center text-[11px] text-yellow-700 whitespace-nowrap">
                            {rentangIstirahat(mode, shift, waktuCfg).mulai}–{rentangIstirahat(mode, shift, waktuCfg).selesai}
                          </td>
                          <td colSpan={hariAda.length} className="px-2 py-1 text-center text-[11px] font-medium text-yellow-700">
                            ☕ Istirahat ({waktuCfg.istirahatMenit} menit)
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
