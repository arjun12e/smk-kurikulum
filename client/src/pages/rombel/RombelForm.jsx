import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RombelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ id_rombel: '', nama_rombel: '', tingkat: 'X', jurusan: '', is_pkl: false });
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/rombel/${id}`).then(r => setForm({ ...r.data, is_pkl: r.data.is_pkl || false }));
    } else {
      // Auto-generate next ID for add mode
      api.get('/rombel').then(res => {
        const maxNum = res.data.reduce((max, r) => {
          const num = parseInt(r.id_rombel.replace('R', '')) || 0;
          return num > max ? num : max;
        }, 0);
        setForm(f => ({ ...f, id_rombel: `R${String(maxNum + 1).padStart(3, '0')}` }));
      }).catch(() => setForm(f => ({ ...f, id_rombel: 'R001' })));
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      isEdit ? await api.put(`/rombel/${id}`, form) : await api.post('/rombel', form);
      toast.success(isEdit ? 'Rombel diperbarui' : 'Rombel ditambahkan');
      navigate('/rombel');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit' : 'Tambah'} Rombel</h2>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Rombel <span className="text-gray-400 font-normal">(Auto-generate)</span></label>
          <input value={form.id_rombel} onChange={e => set('id_rombel', e.target.value)} disabled
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Rombel</label>
          <input value={form.nama_rombel} onChange={e => set('nama_rombel', e.target.value)} placeholder="XII RPL 2"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tingkat</label>
          <select value={form.tingkat} onChange={e => set('tingkat', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>X</option><option>XI</option><option>XII</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan</label>
          <input value={form.jurusan} onChange={e => set('jurusan', e.target.value)} placeholder="TAV / TKJ / TSM / TPM / TKR"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_pkl} onChange={e => set('is_pkl', e.target.checked)}
              className="w-4 h-4 accent-amber-600" />
            <span className="text-sm font-medium text-amber-800">Rombel sedang PKL (Praktik Kerja Lapangan)</span>
          </label>
          <p className="text-xs text-amber-600 mt-1">Rombel PKL belajar di luar sekolah — tetap muncul di jadwal namun tidak menempati ruangan.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={() => navigate('/rombel')} className="px-5 py-2 text-sm text-gray-600">Batal</button>
        </div>
      </form>
    </div>
  );
}
