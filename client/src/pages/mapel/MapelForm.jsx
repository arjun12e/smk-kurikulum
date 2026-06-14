import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function MapelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ id_mapel: '', nama_mapel: '', kategori_mapel: 'Umum', alokasi_per_minggu: 0, jp_diluar: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) api.get(`/mata-pelajaran/${id}`).then(r => setForm(r.data));
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      isEdit ? await api.put(`/mata-pelajaran/${id}`, form) : await api.post('/mata-pelajaran', form);
      toast.success(isEdit ? 'Mapel diperbarui' : 'Mapel ditambahkan');
      navigate('/mata-pelajaran');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit' : 'Tambah'} Mata Pelajaran</h2>
      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Mapel</label>
          <input value={form.id_mapel} onChange={e => set('id_mapel', e.target.value)} disabled={isEdit} placeholder="MP021"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mata Pelajaran</label>
          <input value={form.nama_mapel} onChange={e => set('nama_mapel', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
          <select value={form.kategori_mapel} onChange={e => set('kategori_mapel', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Produktif</option><option>Umum</option><option>Pelajaran Kejuruan</option>
            <option>Muatan Lokal</option><option>Bimbingan dan Konseling</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alokasi per Minggu <span className="text-gray-400 font-normal">(JP)</span></label>
            <input
              type="number" min="0" max="40"
              value={form.alokasi_per_minggu ?? ''}
              onChange={e => set('alokasi_per_minggu', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: 6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JP Diluar <span className="text-gray-400 font-normal">(JP)</span></label>
            <input
              type="number" min="0" max="40"
              value={form.jp_diluar ?? ''}
              onChange={e => set('jp_diluar', parseInt(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: 2"
            />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-blue-700 font-medium">Total Jumlah JP</span>
          <span className="text-lg font-bold text-[#1e3a5f]">
            {(form.alokasi_per_minggu || 0) - (form.jp_diluar || 0)} JP
          </span>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={() => navigate('/mata-pelajaran')} className="px-5 py-2 text-sm text-gray-600">Batal</button>
        </div>
      </form>
    </div>
  );
}
