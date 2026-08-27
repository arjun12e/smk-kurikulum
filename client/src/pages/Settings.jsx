import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const DEFAULT_ISTIRAHAT = [
  { setelah: 4, label: 'MBG', menit: 20 },
  { setelah: 4, label: 'Istirahat', menit: 20 },
  { setelah: 8, label: 'Sholat Dzuhur Berjamaah', menit: 30 },
  { setelah: 12, label: 'Istirahat', menit: 20 },
  { setelah: 12, label: 'MBG', menit: 10 },
];

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

  const NON_NUMERIC = ['fitur_pkl_aktif', 'mode_kurikulum', 'jam_mulai_pagi', 'jam_mulai_siang', 'istirahat_list', 'jadwal_khusus'];
  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: NON_NUMERIC.includes(field) ? value : Number(value)
    }));
  };

  // Editor daftar istirahat
  const updIstirahat = (i, field, val) => setSettings(p => {
    const list = [...(p.istirahat_list || [])];
    list[i] = { ...list[i], [field]: val };
    return { ...p, istirahat_list: list };
  });
  const addIstirahat = () => setSettings(p => ({ ...p, istirahat_list: [...(p.istirahat_list || []), { setelah: 4, label: 'Istirahat', menit: 20 }] }));
  const delIstirahat = (i) => setSettings(p => ({ ...p, istirahat_list: (p.istirahat_list || []).filter((_, idx) => idx !== i) }));

  // Editor jadwal khusus (batas JP per hari/sesi)
  const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const [khHari, setKhHari] = useState('Senin');
  const [khSesi, setKhSesi] = useState('Pagi');
  const setKhususField = (key, field, value) => setSettings(p => ({
    ...p, jadwal_khusus: { ...p.jadwal_khusus, [key]: { ...p.jadwal_khusus[key], [field]: value } },
  }));
  const removeKhusus = (key) => setSettings(p => {
    const jk = { ...(p.jadwal_khusus || {}) }; delete jk[key]; return { ...p, jadwal_khusus: jk };
  });
  const addKhusus = () => setSettings(p => {
    const key = `${khHari}-${khSesi}`;
    if (p.jadwal_khusus?.[key]) return p;
    return { ...p, jadwal_khusus: { ...(p.jadwal_khusus || {}), [key]: { aktif: true, label: '', max_jp: 6 } } };
  });

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
              { val: 'satu_sesi', judul: 'Satu Sesi', desc: 'Senin–Sabtu (6 hari), satu sesi, maks 14 JP/hari. Menampung hari panjang (upacara Senin, Jumat sampai sore) tanpa jadwal khusus per hari & tanpa memadatkan ke 5 hari.' },
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

        {/* Waktu Pelajaran + Daftar Istirahat */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Waktu Pelajaran & Istirahat</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Jam Mulai Hari</label>
              <input type="time" value={settings.jam_mulai_pagi || '06:30'}
                onChange={e => handleChange('jam_mulai_pagi', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Durasi 1 JP (menit)</label>
              <input type="number" min="1" max="120" value={settings.jp_menit ?? 40}
                onChange={e => handleChange('jp_menit', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Total JP / Hari</label>
              <input type="number" min="1" max="20" value={settings.jumlah_jp ?? 14}
                onChange={e => handleChange('jumlah_jp', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Daftar Istirahat (MBG, Sholat, dll.)</h3>
            <button type="button" onClick={() => handleChange('istirahat_list', DEFAULT_ISTIRAHAT)}
              className="text-xs text-blue-600 hover:underline">Reset ke default</button>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[11px] text-gray-400 px-1">
              <span className="col-span-3">Setelah JP ke-</span>
              <span className="col-span-6">Nama</span>
              <span className="col-span-2">Menit</span>
              <span className="col-span-1"></span>
            </div>
            {(settings.istirahat_list || []).map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input type="number" min="0" max="20" value={it.setelah ?? 0}
                  onChange={e => updIstirahat(i, 'setelah', Number(e.target.value))}
                  className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input value={it.label || ''} placeholder="mis. MBG / Sholat Dzuhur"
                  onChange={e => updIstirahat(i, 'label', e.target.value)}
                  className="col-span-6 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" min="0" max="120" value={it.menit ?? 0}
                  onChange={e => updIstirahat(i, 'menit', Number(e.target.value))}
                  className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => delIstirahat(i)}
                  className="col-span-1 text-red-500 hover:text-red-700 text-lg leading-none">✕</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addIstirahat}
            className="mt-2 text-sm px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">+ Tambah Istirahat</button>
          <p className="text-xs text-gray-500 mt-2">Jam tiap JP & baris istirahat di kalender dihitung berurutan dari "Jam Mulai Hari". Beberapa istirahat boleh setelah JP yang sama (mis. MBG lalu Istirahat setelah JP 4).</p>
        </div>

        {/* Jadwal Khusus — batas JP per hari/sesi (upacara, sholat Jumat, dll.) */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">Jadwal Khusus (Batas JP per Hari)</h2>
          <p className="text-xs text-gray-500 mb-4">Batasi jumlah jam pelajaran pada hari tertentu (mis. Senin dipotong upacara, Jumat lebih pendek karena sholat). Jam di atas batas akan ditandai abu-abu di kalender & tidak diisi algoritma.</p>

          {/* Form tambah hari khusus */}
          <div className="flex flex-wrap items-end gap-2 mb-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Hari</label>
              <select value={khHari} onChange={e => setKhHari(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                {HARI_LIST.map(h => <option key={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">Sesi</label>
              <select value={khSesi} onChange={e => setKhSesi(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option>Pagi</option><option>Siang</option>
              </select>
            </div>
            <button type="button" onClick={addKhusus} className="px-3 py-1.5 rounded-lg bg-[#1e3a5f] text-white text-sm hover:bg-[#162d4a]">+ Tambah Hari Khusus</button>
          </div>

          <div className="space-y-2">
            {Object.keys(settings.jadwal_khusus || {}).length === 0 && (
              <p className="text-xs text-gray-400 px-1">Belum ada jadwal khusus. Semua hari memakai jumlah JP penuh.</p>
            )}
            {Object.entries(settings.jadwal_khusus || {}).map(([key, p]) => (
              <div key={key} className={`flex flex-wrap items-center gap-3 rounded-lg border-2 p-3 ${p.aktif ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 opacity-60'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!p.aktif} onChange={e => setKhususField(key, 'aktif', e.target.checked)} className="w-4 h-4 accent-amber-600" />
                  <span className="font-semibold text-gray-800 text-sm w-28">{key.replace('-', ' · ')}</span>
                </label>
                <input value={p.label || ''} onChange={e => setKhususField(key, 'label', e.target.value)} placeholder="Keterangan (mis. Upacara)"
                  className="flex-1 min-w-[140px] border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Sampai JP ke-</span>
                  <input type="number" min="1" max="14" value={p.max_jp ?? 6} onChange={e => setKhususField(key, 'max_jp', Number(e.target.value))}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                <button type="button" onClick={() => removeKhusus(key)} className="text-red-500 hover:text-red-700 text-lg leading-none">✕</button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Generate ulang jadwal setelah mengubah bagian ini (batas JP memengaruhi kapasitas algoritma).</p>
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

        {/* Jatah JP per Tingkat */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Jatah JP per Tingkat</h2>
          <div className="space-y-4">
            {[
              { key: 'jatah_jp_x', label: 'Kelas X', desc: 'Jatah total JP per minggu untuk tiap rombel kelas X' },
              { key: 'jatah_jp_xi', label: 'Kelas XI', desc: 'Jatah total JP per minggu untuk tiap rombel kelas XI' },
              { key: 'jatah_jp_xii', label: 'Kelas XII', desc: 'Jatah total JP per minggu untuk tiap rombel kelas XII' },
            ].map(item => (
              <div key={item.key}>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {item.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={settings[item.key] ?? 50}
                    onChange={e => handleChange(item.key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">JP/minggu</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Total JP kontrak sebuah rombel yang melebihi jatah tingkatnya akan ditandai peringatan di halaman Kontrak Mengajar.</p>
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
