import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RuanganForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ id_ruangan: '', nama_ruangan: '', jenis_ruangan: 'Teori', id_jurusan: '', id_mapel_list: [] });
  const [jurusanList, setJurusanList] = useState([]);
  const [mapelProduktif, setMapelProduktif] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/jurusan').then(r => setJurusanList(r.data)).catch(() => setJurusanList([]));
    api.get('/mata-pelajaran', { params: { kategori: 'Produktif' } })
      .then(r => setMapelProduktif(r.data)).catch(() => setMapelProduktif([]));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api.get(`/ruangan/${id}`).then(r => setForm({
        ...r.data,
        id_jurusan: r.data.id_jurusan || '',
        id_mapel_list: Array.isArray(r.data.id_mapel_list) ? r.data.id_mapel_list : (r.data.id_mapel_list ? String(r.data.id_mapel_list).split(',') : []),
      }));
    } else {
      // Auto-generate next ID for add mode
      api.get('/ruangan').then(res => {
        const maxNum = res.data.reduce((max, r) => {
          const num = parseInt(r.id_ruangan.replace('RU', '')) || 0;
          return num > max ? num : max;
        }, 0);
        setForm(f => ({ ...f, id_ruangan: `RU${String(maxNum + 1).padStart(3, '0')}` }));
      }).catch(() => setForm(f => ({ ...f, id_ruangan: 'RU001' })));
    }
  }, [id, isEdit]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleMapel = (idm) => setForm(f => {
    const has = f.id_mapel_list.includes(idm);
    return { ...f, id_mapel_list: has ? f.id_mapel_list.filter(x => x !== idm) : [...f.id_mapel_list, idm] };
  });

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
          <label className="block text-sm font-medium text-gray-700 mb-1">ID Ruangan <span className="text-gray-400 font-normal">(Auto-generate)</span></label>
          <input value={form.id_ruangan} onChange={e => set('id_ruangan', e.target.value)} disabled
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-600" />
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
        {form.jenis_ruangan !== 'Teori' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan Pemilik <span className="text-gray-400 font-normal">(untuk Lab/Bengkel)</span></label>
            <select value={form.id_jurusan || ''} onChange={e => set('id_jurusan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Tidak terikat jurusan —</option>
              {jurusanList.map(j => <option key={j.id_jurusan} value={j.id_jurusan}>{j.id_jurusan} — {j.nama_jurusan}</option>)}
            </select>
            <p className="text-xs text-gray-500 mt-1">Dipakai sebagai cadangan jika daftar mapel di bawah kosong.</p>
          </div>
        )}
        {form.jenis_ruangan !== 'Teori' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mapel yang boleh di ruangan ini <span className="text-gray-400 font-normal">(produktif)</span></label>
            <div className="border border-gray-200 rounded-lg p-2 max-h-52 overflow-auto space-y-1">
              {mapelProduktif.length === 0 && <p className="text-xs text-gray-400 px-1">Tidak ada mapel produktif.</p>}
              {mapelProduktif.map(m => (
                <label key={m.id_mapel} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                  <input type="checkbox" checked={form.id_mapel_list.includes(m.id_mapel)} onChange={() => toggleMapel(m.id_mapel)} className="accent-blue-600" />
                  <span className="truncate">{m.nama_mapel}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Centang mapel produktif yang memakai ruangan ini. {form.id_mapel_list.length > 0 ? `${form.id_mapel_list.length} mapel dipilih.` : 'Kosong = pakai aturan jurusan.'}
            </p>
          </div>
        )}
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
