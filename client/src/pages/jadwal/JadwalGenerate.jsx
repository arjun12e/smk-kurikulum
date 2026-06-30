import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function JadwalGenerate() {
  const [status, setStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  const checkStatus = async () => {
    const res = await api.get('/jadwal/status');
    setStatus(res.data);
    if (res.data.selesai || res.data.error) {
      clearInterval(timerRef.current);
      setPolling(false);
      if (res.data.selesai) {
        toast.success(`Jadwal berhasil digenerate! ${res.data.totalJadwal} slot tersimpan.`);
      }
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const jalankan = async () => {
    try {
      await api.post('/jadwal/generate');
      setPolling(true);
      timerRef.current = setInterval(checkStatus, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memulai GA');
    }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const persen = status?.generasi ? Math.min(100, Math.round((status.generasi / 200) * 100)) : 0;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Jalankan Algoritma Genetika</h2>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚡</div>
          <p className="text-gray-600 text-sm">
            Algoritma Genetika akan mengoptimalkan pembagian jadwal berdasarkan preferensi guru dan constraint ruangan.
          </p>
        </div>

        {status?.running && (
          <div className="mb-5">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Generasi {status.generasi} / 200</span>
              <span>{persen}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${persen}%` }} />
            </div>
            {status.fitness !== null && (
              <p className="text-xs text-gray-500 mt-1">Fitness terbaik: {status.fitness.toFixed(2)}</p>
            )}
          </div>
        )}

        {status?.selesai && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700 space-y-1">
            <div>✅ Selesai! {status.totalJadwal} slot jadwal tersimpan. Fitness: {status.fitness?.toFixed(2)}</div>
            <div className="text-xs text-green-600">
              {status.pelanggaranHard === 0
                ? 'Tidak ada pelanggaran (bentrok/ruangan).'
                : `⚠️ ${status.pelanggaranHard} pelanggaran tersisa (bentrok waktu).`}
              {status.jpDiluar > 0 && ` · ${status.jpDiluar} JP di luar dijadwalkan tanpa ruangan.`}
              {status.kontrakPkl > 0 && ` · ${status.kontrakPkl} kontrak PKL dijadwalkan tanpa ruangan.`}
            </div>
          </div>
        )}

        {status?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            ❌ Error: {status.error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={jalankan}
            disabled={status?.running}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {status?.running ? 'Sedang Berjalan...' : 'Mulai Generate Jadwal'}
          </button>
          {status?.selesai && (
            <button onClick={() => navigate('/jadwal')} className="flex-1 bg-[#1e3a5f] text-white py-3 rounded-lg font-medium hover:bg-[#162d4a]">
              Lihat Jadwal →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
