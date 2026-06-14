import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const defaultPreferensi = () => Object.fromEntries(HARI.map(h => [h, 3]));

export default function KontrakForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ id_guru: '', id_mapel: '', id_rombel: '', jumlah_jp: 2, max_jam_harian: 6, preferensi_hari: defaultPreferensi() });
  const [guruList, setGuruList] = useState([]);
  const [mapelList, setMapelList] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [newGuru, setNewGuru] = useState({ id_guru: '', nama_guru: '', status_kepegawaian: 'PNS', jenis_guru: 'Jurusan' });

  useEffect(() => {
    Promise.all([api.get('/guru'), api.get('/mata-pelajaran'), api.get('/rombel')]).then(([g, m, r]) => {
      setGuruList(g.data);
      setMapelList(m.data);
      setRombelList(r.data);
    });
    if (isEdit) {
      api.get(`/kontrak-mengajar/${id}`).then(res => {
        setForm({
          id_guru: res.data.id_guru,
          id_mapel: res.data.id_mapel,
          id_rombel: res.data.id_rombel,
          jumlah_jp: res.data.jumlah_jp,
          max_jam_harian: res.data.max_jam_harian,
          preferensi_hari: res.data.preferensi_hari || defaultPreferensi(),
        });
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setBobot = (hari, val) => setForm(f => ({ ...f, preferensi_hari: { ...f.preferensi_hari, [hari]: Number(val) } }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/kontrak-mengajar/${id}`, form);
        toast.success('Kontrak berhasil diperbarui');
      } else {
        await api.post('/kontrak-mengajar', form);
        toast.success('Kontrak berhasil ditambahkan');
      }
      navigate('/kontrak-mengajar');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const simpanGuruBaru = async () => {
    try {
      const res = await api.post('/guru', newGuru);
      setGuruList(l => [...l, res.data]);
      set('id_guru', res.data.id_guru);
      setShowGuruModal(false);
      setNewGuru({ id_guru: '', nama_guru: '', status_kepegawaian: 'PNS', jenis_guru: 'Jurusan' });
      toast.success('Guru baru berhasil ditambahkan');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menambah guru');
    }
  };

  const BADGE = { PNS: '🔵', GTY: '🟢', GTT: '⚪' };

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit Kontrak Mengajar' : 'Tambah Kontrak Mengajar'}</h2>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {/* Guru */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
          <div className="flex gap-2">
            <select value={form.id_guru} onChange={e => set('id_guru', e.target.value)} required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Pilih guru...</option>
              {guruList.map(g => <option key={g.id_guru} value={g.id_guru}>{BADGE[g.status_kepegawaian]} {g.nama_guru} ({g.status_kepegawaian})</option>)}
            </select>
            <button type="button" onClick={() => setShowGuruModal(true)}
              className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
              + Baru
            </button>
          </div>
        </div>

        {/* Mapel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
          <select value={form.id_mapel} onChange={e => set('id_mapel', e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Pilih mata pelajaran...</option>
            {mapelList.map(m => <option key={m.id_mapel} value={m.id_mapel}>{m.nama_mapel} — {m.kategori_mapel}</option>)}
          </select>
        </div>

        {/* Rombel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rombel</label>
          <select value={form.id_rombel} onChange={e => set('id_rombel', e.target.value)} required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Pilih rombel...</option>
            {rombelList.map(r => <option key={r.id_rombel} value={r.id_rombel}>{r.nama_rombel} ({r.tingkat})</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah JP / Minggu</label>
            <input type="number" min={1} max={40} value={form.jumlah_jp} onChange={e => set('jumlah_jp', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maks Jam Harian</label>
            <input type="number" min={1} max={8} value={form.max_jam_harian} onChange={e => set('max_jam_harian', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Preferensi Hari */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferensi Hari (bobot 1–5)</label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">Hari</th>
                  {[1,2,3,4,5].map(n => <th key={n} className="px-3 py-2 text-center text-gray-500">{n}</th>)}
                </tr>
              </thead>
              <tbody>
                {HARI.map(hari => (
                  <tr key={hari} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-700">{hari}</td>
                    {[1,2,3,4,5].map(n => (
                      <td key={n} className="px-3 py-2 text-center">
                        <input
                          type="radio"
                          name={`pref-${hari}`}
                          checked={form.preferensi_hari[hari] === n}
                          onChange={() => setBobot(hari, n)}
                          className="accent-blue-600"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={() => navigate('/kontrak-mengajar')} className="px-5 py-2 text-sm text-gray-600">Batal</button>
        </div>
      </form>

      {/* Modal Quick Add Guru */}
      {showGuruModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 mb-4">Tambah Guru Baru</h3>
            <div className="space-y-3">
              <input placeholder="ID Guru (misal: G019)" value={newGuru.id_guru} onChange={e => setNewGuru(g => ({ ...g, id_guru: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input placeholder="Nama Guru" value={newGuru.nama_guru} onChange={e => setNewGuru(g => ({ ...g, nama_guru: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={newGuru.status_kepegawaian} onChange={e => setNewGuru(g => ({ ...g, status_kepegawaian: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>PNS</option><option>P3K</option><option>Honorer</option>
              </select>
              <select value={newGuru.jenis_guru} onChange={e => setNewGuru(g => ({ ...g, jenis_guru: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Jurusan</option><option>Umum</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={simpanGuruBaru} className="flex-1 bg-orange-500 text-white py-2 rounded-lg text-sm hover:bg-orange-600">Simpan</button>
              <button onClick={() => setShowGuruModal(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm">Batal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
