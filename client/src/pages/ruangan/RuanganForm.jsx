import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RuanganForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ id_ruangan: '', nama_ruangan: '', jenis_ruangan: 'Teori' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (isEdit) api.get(`/ruangan/${id}`).then(r => setForm(r.data)); }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      isEdit ? await api.put(`/ruangan/${id}`, form) : await api.post('/ruangan', form);
      toast.success(isEdit ? 'Ruangan diperbarui' : 'Ruangan ditambahkan');
      navigate('/ruangan');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit' : 'Tambah'} Ruangan</h2>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Ruangan</label>
          <input value={form.id_ruangan} onChange={e => set('id_ruangan', e.target.value)} disabled={isEdit} placeholder="RU010"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Ruangan</label>
          <input value={form.nama_ruangan} onChange={e => set('nama_ruangan', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Ruangan</label>
          <select value={form.jenis_ruangan} onChange={e => set('jenis_ruangan', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Teori</option><option>Lab</option><option>Bengkel</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={() => navigate('/ruangan')} className="px-5 py-2 text-sm text-gray-600">Batal</button>
        </div>
      </form>
    </div>
  );
}
