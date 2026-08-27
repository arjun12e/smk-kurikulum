import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import TarsLoader from '../../components/TarsLoader';

export default function JadwalGenerate() {
  const [status, setStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [jumlahKontrak, setJumlahKontrak] = useState(null);
  const timerRef = useRef(null);
  const notifiedRef = useRef(false); // cegah toast sukses muncul lebih dari sekali
  const navigate = useNavigate();

  const stopPolling = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
    setPolling(false);
  };

  // Ambil status tanpa notifikasi (dipakai saat mount & tiap polling)
  const checkStatus = async () => {
    const res = await api.get('/jadwal/status');
    setStatus(res.data);
    return res.data;
  };

  useEffect(() => {
    // Saat halaman dibuka, jangan tampilkan toast untuk hasil generate lama.
    checkStatus().then(d => { if (d.selesai || d.error) notifiedRef.current = true; });
    api.get('/dashboard').then(r => setJumlahKontrak(r.data.totalKontrak)).catch(() => {});
    return () => clearInterval(timerRef.current);
  }, []);

  const jalankan = async (mode) => {
    if (mode === 'full' && !confirm('Generate ulang penuh akan MENGHAPUS jadwal lama + editan manual, lalu menjadwalkan semua kontrak dari nol. Lanjutkan?')) return;
    try {
      await api.post('/jadwal/generate', { mode });
      notifiedRef.current = false;      // reset untuk run baru
      setPolling(true);
      clearInterval(timerRef.current);
      timerRef.current = setInterval(async () => {
        const d = await checkStatus();
        if ((d.selesai || d.error) && !notifiedRef.current) {
          notifiedRef.current = true;   // pastikan hanya sekali
          stopPolling();
          if (d.selesai) toast.success(`Jadwal berhasil digenerate! ${d.ditambahkan != null && d.modeGenerate === 'incremental' ? `${d.ditambahkan} slot ditambahkan` : `${d.totalJadwal} slot tersimpan`}.`);
          else if (d.error) toast.error(`Gagal: ${d.error}`);
        }
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memulai GA');
    }
  };

  const persen = status?.generasi ? Math.min(100, Math.round((status.generasi / 200) * 100)) : 0;

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Jalankan Algoritma Genetika</h2>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚡</div>
          {jumlahKontrak != null && !status?.running && (
            <p className="text-sm text-gray-700 mb-2">Siap menjadwalkan <strong className="text-orange-600">{jumlahKontrak}</strong> kontrak mengajar.</p>
          )}
          <p className="text-gray-600 text-sm">
            <strong>Tambah ke Jadwal</strong> hanya menjadwalkan kontrak yang belum terjadwal (jadwal lama & editan manual dipertahankan). <strong>Generate Ulang Penuh</strong> menjadwalkan semua dari nol.
          </p>
        </div>

        {status?.running && (
          <div className="mb-5">
            <TarsLoader jumlahKontrak={jumlahKontrak} generasi={status.generasi} fitness={status.fitness} />
            <div className="flex justify-between text-sm text-gray-600 mb-1 mt-3">
              <span>Generasi {status.generasi} / 200</span>
              <span>{persen}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-orange-500 h-3 rounded-full transition-all" style={{ width: `${persen}%` }} />
            </div>
          </div>
        )}

        {status?.selesai && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700 space-y-1">
            <div>✅ Selesai! {status.modeGenerate === 'incremental' ? `${status.ditambahkan ?? 0} slot ditambahkan (total ${status.totalJadwal}).` : `${status.totalJadwal} slot jadwal tersimpan.`}</div>
            <div className="text-xs text-green-600">
              {status.pelanggaranHard === 0
                ? 'Tidak ada pelanggaran (bentrok/ruangan).'
                : `⚠️ ${status.pelanggaranHard} pelanggaran tersisa (bentrok waktu).`}
              {status.jpDiluar > 0 && ` · ${status.jpDiluar} JP di luar kelas (mis. PJOK di lapangan) dijadwalkan tanpa ruangan.`}
              {status.kontrakPkl > 0 && ` · ${status.kontrakPkl} kontrak PKL dijadwalkan tanpa ruangan.`}
              {status.produktifDiTeori > 0 && ` · ${status.produktifDiTeori} JP produktif dialihkan ke ruang teori (lab/bengkel penuh).`}
            </div>
            {status.kepuasanPreferensi != null && (
              <div className="text-xs text-green-600">💚 Kepuasan preferensi hari guru: <strong>{status.kepuasanPreferensi}%</strong> JP di hari yang disukai.</div>
            )}
            {status.rincianPelanggaran && status.pelanggaranHard > 0 && (
              <div className="mt-2 pt-2 border-t border-green-200 text-xs text-gray-600">
                <div className="font-semibold text-gray-700 mb-1">Rincian penyebab bentrok:</div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>👨‍🏫 Guru: <strong>{status.rincianPelanggaran.guru}</strong></span>
                  <span>👥 Rombel: <strong>{status.rincianPelanggaran.rombel}</strong></span>
                  <span>🏫 Ruangan: <strong>{status.rincianPelanggaran.ruangan}</strong></span>
                  <span>📅 Beda-hari: <strong>{status.rincianPelanggaran.bedaHari}</strong></span>
                  <span>🌓 Sesi ganda: <strong>{status.rincianPelanggaran.sesiGanda ?? 0}</strong></span>
                  <span>⏱️ Kapasitas: <strong>{status.rincianPelanggaran.kapasitas}</strong></span>
                </div>
                <div className="mt-1 text-gray-500">
                  {status.rincianPelanggaran.rombel >= status.rincianPelanggaran.ruangan && status.rincianPelanggaran.rombel > 0
                    ? 'Penyebab terbesar: total JP rombel melebihi kapasitas mingguan (hari aktif × JP per sesi). Kurangi alokasi JP atau tambah hari aktif rombel.'
                    : status.rincianPelanggaran.ruangan > 0
                    ? 'Penyebab terbesar: ruangan kurang untuk beban serentak. Tambah ruang teori / lab.'
                    : 'Bentrok kecil tersisa — coba jalankan ulang.'}
                </div>
              </div>
            )}
          </div>
        )}

        {status?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            ❌ Error: {status.error}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => jalankan('incremental')}
              disabled={status?.running}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {status?.running ? 'Sedang Berjalan...' : '➕ Tambah ke Jadwal'}
            </button>
            <button
              onClick={() => jalankan('full')}
              disabled={status?.running}
              className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              🔄 Generate Ulang Penuh
            </button>
          </div>
          {status?.selesai && (
            <button onClick={() => navigate('/jadwal')} className="w-full bg-[#1e3a5f] text-white py-3 rounded-lg font-medium hover:bg-[#162d4a]">
              Lihat & Edit Jadwal →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
