import { useEffect, useState } from 'react';
import api from '../../api/axios';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SLOTS = [1, 2, 3, 4, 5];
const KASTA_COLOR = { PNS: 'bg-blue-100 text-blue-800', P3K: 'bg-green-100 text-green-800', Honorer: 'bg-gray-100 text-gray-700' };

export default function JadwalIndex() {
  const [jadwal, setJadwal] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [filterRombel, setFilterRombel] = useState('');
  const [filterShift, setFilterShift] = useState('Pagi');

  useEffect(() => {
    api.get('/rombel').then(r => setRombelList(r.data));
  }, []);

  useEffect(() => {
    const params = {};
    if (filterRombel) params.id_rombel = filterRombel;
    if (filterShift) params.waktu_shift = filterShift;
    api.get('/jadwal', { params }).then(r => setJadwal(r.data));
  }, [filterRombel, filterShift]);

  const getSlot = (hari, slot) => jadwal.filter(j => j.hari === hari && j.slot_jam === slot);

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
                <th className="px-3 py-3 text-left w-16">Slot</th>
                {HARI.map(h => <th key={h} className="px-3 py-3 text-center">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(slot => (
                <tr key={slot} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-bold text-gray-500 text-center bg-gray-50">{slot}</td>
                  {HARI.map(hari => {
                    const cells = getSlot(hari, slot);
                    return (
                      <td key={hari} className="px-2 py-2 align-top min-w-[120px]">
                        {cells.map(j => (
                          <div key={j.id_jadwal} className={`rounded p-1.5 mb-1 text-xs ${KASTA_COLOR[j.KontrakMengajar?.Guru?.status_kepegawaian]}`}>
                            <div className="font-medium truncate">{j.KontrakMengajar?.MataPelajaran?.nama_mapel}</div>
                            <div className="opacity-75 truncate">{j.KontrakMengajar?.Guru?.nama_guru}</div>
                            <div className="opacity-60">{j.Rombel?.nama_rombel} · {j.Ruangan?.nama_ruangan}</div>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
