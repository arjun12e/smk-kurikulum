import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RombelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ id_rombel: '', nama_rombel: '', tingkat: 'X', jurusan: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isEdit) api.get(`/rombel/${id}`).then(r => setForm(r.data)); }, [id]);

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
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Rombel</label>
          <input value={form.id_rombel} onChange={e => set('id_rombel', e.target.value)} disabled={isEdit} placeholder="R011"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" required />
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
          <input value={form.jurusan} onChange={e => set('jurusan', e.target.value)} placeholder="RPL / TKJ / AKL"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
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
