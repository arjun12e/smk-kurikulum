import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function GuruForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    id_guru: '',
    nama_guru: '',
    status_kepegawaian: 'PNS',
    jenis_guru: 'Jurusan',
    total_jam_mengajar: 24,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.get(`/guru/${id}`).then(res => setForm(res.data));
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/guru/${id}`, form);
        toast.success('Guru berhasil diperbarui');
      } else {
        await api.post('/guru', form);
        toast.success('Guru berhasil ditambahkan');
      }
      navigate('/guru');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-bold text-gray-800 mb-6">{isEdit ? 'Edit Guru' : 'Tambah Guru'}</h2>

      <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Guru</label>
            <input
              value={form.id_guru}
              disabled
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Guru</label>
          <input
            value={form.nama_guru}
            onChange={e => set('nama_guru', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status Kepegawaian</label>
          <select
            value={form.status_kepegawaian}
            onChange={e => set('status_kepegawaian', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>GTY</option>
            <option>PNS</option>
            <option>GTT</option>
          </select>
        </div>
        <div>
  <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Guru</label>
      <div className="flex gap-4">
        {/* Pilihan Jurusan */}
        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.jenis_guru.includes('Jurusan')}
            onChange={e => {
              const updated = e.target.checked
                ? [...form.jenis_guru, 'Jurusan'] // Tambah jika dicentang
                : form.jenis_guru.filter(item => item !== 'Jurusan'); // Hapus jika dicentang ulang
              set('jenis_guru', updated);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
          />
          Jurusan
        </label>

        {/* Pilihan Umum */}
        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.jenis_guru.includes('Umum')}
            onChange={e => {
              const updated = e.target.checked
                ? [...form.jenis_guru, 'Umum']
                : form.jenis_guru.filter(item => item !== 'Umum');
              set('jenis_guru', updated);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
          />
          Umum
        </label>
      </div>
    </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Jam Mengajar <span className="text-gray-400 font-normal">(JP/minggu)</span></label>
          <input
            type="number"
            min="0"
            max="40"
            value={form.total_jam_mengajar ?? ''}
            onChange={e => set('total_jam_mengajar', parseInt(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 24"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[#1e3a5f] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#162d4a] disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
          <button type="button" onClick={() => navigate('/guru')} className="px-5 py-2 text-sm text-gray-600 hover:text-gray-800">
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
