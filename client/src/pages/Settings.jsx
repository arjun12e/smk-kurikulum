import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      toast.error('Gagal memuat pengaturan');
    } finally {
      setLoading(false);
    }
  };

  const NON_NUMERIC = ['fitur_pkl_aktif', 'mode_kurikulum', 'jam_mulai_pagi', 'jam_mulai_siang'];
  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: NON_NUMERIC.includes(field) ? value : Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!settings) {
    return <div className="text-center text-red-600">Gagal memuat pengaturan</div>;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Pengaturan Sistem</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        {/* Mode Kurikulum */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Mode Kurikulum (Penjadwalan)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { val: 'dua_sesi', judul: 'Dua Sesi', desc: 'Senin–Sabtu, sesi Pagi & Siang (8 jam/sesi). Seperti yang berjalan saat ini.' },
              { val: 'satu_sesi', judul: 'Satu Sesi', desc: 'Senin–Jumat, satu sesi, maks 10 JP/hari (≈50 JP/minggu). Jumlah jam tiap hari bisa berbeda.' },
            ].map(opt => (
              <label key={opt.val}
                className={`cursor-pointer rounded-lg border-2 p-4 transition ${settings.mode_kurikulum === opt.val ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input type="radio" name="mode_kurikulum" checked={settings.mode_kurikulum === opt.val}
                    onChange={() => handleChange('mode_kurikulum', opt.val)} className="accent-blue-600" />
                  <span className="font-semibold text-gray-800">{opt.judul}</span>
                </div>
                <p className="text-xs text-gray-600">{opt.desc}</p>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Mode ini menentukan hari, sesi, dan kapasitas jam saat menjalankan algoritma penjadwalan. Generate ulang jadwal setelah mengubahnya.</p>
        </div>

        {/* Waktu Pelajaran */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Waktu Pelajaran (Kalender)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Durasi 1 JP (menit)</label>
              <input type="number" min="1" max="120" value={settings.jp_menit ?? 40}
                onChange={e => handleChange('jp_menit', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Durasi Istirahat (menit)</label>
              <input type="number" min="0" max="120" value={settings.istirahat_menit ?? 35}
                onChange={e => handleChange('istirahat_menit', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Jam Mulai Pagi / Satu Sesi</label>
              <input type="time" value={settings.jam_mulai_pagi || '07:00'}
                onChange={e => handleChange('jam_mulai_pagi', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Jam Mulai Siang <span className="text-gray-400">(mode dua sesi)</span></label>
              <input type="time" value={settings.jam_mulai_siang || '13:00'}
                onChange={e => handleChange('jam_mulai_siang', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Istirahat setelah JP ke- <span className="text-gray-400">(dua sesi)</span></label>
              <input type="number" min="1" max="10" value={settings.istirahat_setelah_dua_sesi ?? 4}
                onChange={e => handleChange('istirahat_setelah_dua_sesi', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Istirahat setelah JP ke- <span className="text-gray-400">(satu sesi)</span></label>
              <input type="number" min="1" max="12" value={settings.istirahat_setelah_satu_sesi ?? 5}
                onChange={e => handleChange('istirahat_setelah_satu_sesi', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Dipakai untuk menampilkan kolom waktu & istirahat di kalender akademik (rombel & guru).</p>
        </div>

        {/* Jam Mengajar */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Batasan Jam Mengajar</h2>
          <div className="space-y-2">
            <label className="block text-sm text-gray-600">
              Maksimal Jam Mengajar per Minggu (Guru)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="48"
                value={settings.max_jam_mengajar}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  // Jika input kosong, izinkan kosong agar user bisa menghapus angka
                  if (e.target.value === '') {
                    handleChange('max_jam_mengajar', '');
                  } else if (val <= 48) {
                    handleChange('max_jam_mengajar', val);
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500 whitespace-nowrap">jam/minggu</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Batas maksimal jumlah jam mengajar yang dapat dialokasikan untuk satu guru dalam seminggu
            </p>
          </div>
        </div>

        {/* Jatah Mapel */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Jatah Mata Pelajaran per Tingkat</h2>
          <div className="space-y-4">
            {[
              { key: 'jatah_mapel_x', label: 'Kelas X', desc: 'Jatah mata pelajaran untuk kelas X' },
              { key: 'jatah_mapel_xi', label: 'Kelas XI', desc: 'Jatah mata pelajaran untuk kelas XI' },
              { key: 'jatah_mapel_xii', label: 'Kelas XII', desc: 'Jatah mata pelajaran untuk kelas XII' },
            ].map(item => (
              <div key={item.key}>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {item.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={settings[item.key]}
                    onChange={e => handleChange(item.key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">mapel</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fitur PKL */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Praktik Kerja Lapangan (PKL)</h2>
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              checked={settings.fitur_pkl_aktif}
              onChange={e => handleChange('fitur_pkl_aktif', e.target.checked)}
              className="w-5 h-5 accent-blue-600"
            />
            <div>
              <p className="font-medium text-gray-700">Aktifkan Fitur PKL</p>
              <p className="text-sm text-gray-600 mt-1">
                Ketika diaktifkan, guru dapat menandai kontrak mengajar sebagai PKL. 
                Rombel PKL tidak akan menggunakan ruang kelas atau lab dalam penjadwalan.
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
          <button
            onClick={loadSettings}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-medium"
          >
            Reset
          </button>
        </div>

        {/* Info Section */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">ℹ️ Informasi</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Pengaturan ini berlaku global untuk seluruh sistem</li>
            <li>• Perubahan akan langsung mempengaruhi fitur-fitur terkait</li>
            <li>• Batasan jam mengajar digunakan untuk validasi kontrak</li>
            <li>• PKL dapat diatur per kontrak ketika fitur diaktifkan</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
