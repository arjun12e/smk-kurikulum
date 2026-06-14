import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(res => setStats(res.data));
  }, []);

  const cards = stats ? [
    { label: 'Total Guru', value: stats.totalGuru, icon: '👨‍🏫', color: 'bg-blue-50 text-blue-700' },
    { label: 'Total Rombel', value: stats.totalRombel, icon: '🏫', color: 'bg-green-50 text-green-700' },
    { label: 'Kontrak Mengajar', value: stats.totalKontrak, icon: '📋', color: 'bg-purple-50 text-purple-700' },
    {
      label: 'Status Jadwal',
      value: stats.jadwalSudahDigenerate ? `${stats.totalJadwal} slot` : 'Belum digenerate',
      icon: '📅',
      color: stats.jadwalSudahDigenerate ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-500',
    },
  ] : [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {stats === null ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(card => (
              <div key={card.label} className={`rounded-xl p-5 ${card.color}`}>
                <div className="text-3xl mb-2">{card.icon}</div>
                <div className="text-2xl font-bold">{card.value}</div>
                <div className="text-sm mt-1 opacity-80">{card.label}</div>
              </div>
            ))}
          </div>

          {!stats.jadwalSudahDigenerate && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-700">
              <strong>Jadwal belum digenerate.</strong> Klik menu <em>Jalankan Algoritma GA</em> di sidebar untuk memulai optimasi penjadwalan.
            </div>
          )}
        </>
      )}
    </div>
  );
}
