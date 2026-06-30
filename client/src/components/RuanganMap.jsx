import { useEffect, useState } from 'react';
import api from '../api/axios';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_PENDEK = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const SHIFT = ['Pagi', 'Siang'];
const SLOTS = [1, 2, 3, 4, 5,6,7,8];

// Warna per jenis ruangan
const JENIS_STYLE = {
  Teori: { dot: 'bg-blue-500', bar: 'bg-blue-500', cell: 'bg-blue-500', soft: 'bg-blue-50 text-blue-700' },
  Lab: { dot: 'bg-green-500', bar: 'bg-green-500', cell: 'bg-green-500', soft: 'bg-green-50 text-green-700' },
  Bengkel: { dot: 'bg-orange-500', bar: 'bg-orange-500', cell: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700' },
};

function RuanganCard({ r }) {
  const style = JENIS_STYLE[r.jenis_ruangan] || JENIS_STYLE.Teori;
  const persen = r.kapasitas ? Math.round((r.terpakai / r.kapasitas) * 100) : 0;

  // Set slot terpakai -> "hari-shift-slot"
  const terpakai = new Set(r.detail.map(d => `${d.hari}-${d.waktu_shift}-${d.slot_jam}`));
  const info = {};
  r.detail.forEach(d => { info[`${d.hari}-${d.waktu_shift}-${d.slot_jam}`] = d; });

  return (
    <div className={`rounded-xl border p-3 ${r.terpakai === 0 ? 'border-dashed border-gray-300 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style.dot}`} />
          <span className="text-sm font-semibold text-gray-800 truncate" title={r.nama_ruangan}>{r.nama_ruangan}</span>
        </div>
        {r.id_jurusan && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style.soft}`}>{r.id_jurusan}</span>}
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2">
        <span>{r.jenis_ruangan}</span>
        <span>{r.terpakai === 0 ? <span className="text-gray-400 font-medium">Kosong</span> : `${r.terpakai}/${r.kapasitas} (${persen}%)`}</span>
      </div>

      {/* Bar utilisasi */}
      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`h-full ${style.bar}`} style={{ width: `${persen}%` }} />
      </div>

      {/* Mini heatmap: kolom = hari, baris = Pagi1-5, Siang1-5 */}
      <div className="grid grid-cols-6 gap-[3px]">
        {HARI.map((hari, hi) => (
          <div key={hari} className="flex flex-col gap-[2px]">
            <div className="text-[8px] text-center text-gray-400 leading-none mb-[1px]">{HARI_PENDEK[hi]}</div>
            {SHIFT.map(shift =>
              SLOTS.map(slot => {
                const key = `${hari}-${shift}-${slot}`;
                const isi = terpakai.has(key);
                const d = info[key];
                return (
                  <div
                    key={key}
                    title={isi ? `${hari} ${shift} jam ${slot}\n${d.mapel || ''}\n${d.rombel || ''}${d.guru ? ' — ' + d.guru : ''}` : `${hari} ${shift} jam ${slot} (kosong)`}
                    className={`h-2 rounded-[2px] ${isi ? style.cell : 'bg-gray-200'} ${shift === 'Siang' && slot === 1 ? 'mt-[2px]' : ''}`}
                  />
                );
              })
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RuanganMap() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('Semua');

  useEffect(() => {
    api.get('/jadwal/ruangan-map').then(res => setData(res.data)).catch(() => setData({ ruangan: [], kapasitas: 0 }));
  }, []);

  if (data === null) return <p className="text-gray-500 text-sm">Memuat peta ruangan...</p>;

  const ruangan = data.ruangan || [];
  const jenisAda = ['Semua', ...Array.from(new Set(ruangan.map(r => r.jenis_ruangan)))];
  const tampil = filter === 'Semua' ? ruangan : ruangan.filter(r => r.jenis_ruangan === filter);

  const totalTerpakai = ruangan.reduce((s, r) => s + r.terpakai, 0);
  const totalKapasitas = ruangan.reduce((s, r) => s + r.kapasitas, 0);
  const kosong = ruangan.filter(r => r.terpakai === 0).length;

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Peta Penggunaan Ruangan</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {ruangan.length} ruangan · {kosong} kosong · utilisasi total {totalKapasitas ? Math.round((totalTerpakai / totalKapasitas) * 100) : 0}%
          </p>
        </div>
        <div className="flex gap-1">
          {jenisAda.map(j => (
            <button key={j} onClick={() => setFilter(j)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${filter === j ? 'bg-[#1e3a5f] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {j}
            </button>
          ))}
        </div>
      </div>

      {ruangan.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada data. Generate jadwal terlebih dahulu untuk melihat penggunaan ruangan.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {tampil.map(r => <RuanganCard key={r.id_ruangan} r={r} />)}
        </div>
      )}
    </div>
  );
}
