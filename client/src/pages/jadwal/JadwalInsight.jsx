import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

const KASTA_COLOR = { PNS: '#3b82f6', P3K: '#22c55e', Honorer: '#9ca3af' };

export default function JadwalInsight() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/jadwal/insight').then(r => setData(r.data));
  }, []);

  if (!data) return <p className="text-gray-500 text-sm">Memuat data insight...</p>;

  const cardData = Object.entries(data.kepuasan).map(([kasta, persen]) => ({ kasta, persen }));

  const chartData = Object.entries(data.stats).map(([kasta, s]) => ({
    name: kasta,
    Sesuai: s.sesuai,
    'Tidak Sesuai': s.total - s.sesuai,
  }));

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Insight Kepuasan Guru</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {cardData.map(({ kasta, persen }) => (
          <div key={kasta} className="bg-white rounded-xl shadow-sm p-5">
            <div className="text-3xl font-bold" style={{ color: KASTA_COLOR[kasta] }}>{persen}%</div>
            <div className="text-sm text-gray-600 mt-1">Kepuasan {kasta}</div>
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${persen}%`, backgroundColor: KASTA_COLOR[kasta] }} />
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">Distribusi Kepuasan per Kasta</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sesuai" fill="#22c55e" />
            <Bar dataKey="Tidak Sesuai" fill="#f87171" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per guru table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Guru</th>
              <th className="px-4 py-3 text-left">Kasta</th>
              <th className="px-4 py-3 text-left">Jadwal Dialokasikan</th>
              <th className="px-4 py-3 text-left">Rerata Bobot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.perGuru.map(g => {
              const rerata = g.jadwal.reduce((s, j) => s + j.bobot_preferensi, 0) / (g.jadwal.length || 1);
              return (
                <tr key={g.id_guru} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{g.nama_guru}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: KASTA_COLOR[g.status_kepegawaian], backgroundColor: `${KASTA_COLOR[g.status_kepegawaian]}22` }}>
                      {g.status_kepegawaian}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {g.jadwal.map(j => `${j.hari} slot-${j.slot_jam} (${j.waktu_shift})`).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${rerata >= 3 ? 'text-green-600' : 'text-red-500'}`}>{rerata.toFixed(1)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
