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
    jenis_guru: ['Jurusan'],
    id_jurusan: '',
    total_jam_mengajar: 24,
  });
  const [jurusanList, setJurusanList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/jurusan').then(res => setJurusanList(res.data)).catch(() => {
      toast.error('Gagal memuat data jurusan');
    });

    if (isEdit) {
      api.get(`/guru/${id}`).then(res => {
        const d = res.data;
        // jenis_guru & id_jurusan bisa datang sebagai array atau string
        const jenis = Array.isArray(d.jenis_guru)
          ? d.jenis_guru
          : (d.jenis_guru ? String(d.jenis_guru).split(',').map(s => s.trim()).filter(Boolean) : []);
        const jur = Array.isArray(d.id_jurusan) ? (d.id_jurusan[0] || '') : (d.id_jurusan || '');
        setForm({ ...d, jenis_guru: jenis, id_jurusan: jur });
      });
    }
  }, [id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleJenis = (val) => setForm(f => {
    const has = f.jenis_guru.includes(val);
    const jenis_guru = has ? f.jenis_guru.filter(x => x !== val) : [...f.jenis_guru, val];
    return { ...f, jenis_guru };
  });

  const submit = async e => {
    e.preventDefault();
    if (form.jenis_guru.length === 0) return toast.error('Pilih minimal satu jenis guru');
    if (form.jenis_guru.includes('Jurusan') && !form.id_jurusan) return toast.error('Pilih jurusan untuk guru jurusan');

    setLoading(true);
    const payload = {
      ...form,
      id_jurusan: form.jenis_guru.includes('Jurusan') ? form.id_jurusan : '',
    };
    try {
      if (isEdit) {
        await api.put(`/guru/${id}`, payload);
        toast.success('Guru berhasil diperbarui');
      } else {
        await api.post('/guru', payload);
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Guru <span className="text-gray-400 font-normal">(bisa pilih dua)</span></label>
          <div className="flex gap-4">
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.jenis_guru.includes('Jurusan')}
                onChange={() => toggleJenis('Jurusan')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Guru Jurusan
            </label>
            <label className="flex items-center text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.jenis_guru.includes('Umum')}
                onChange={() => toggleJenis('Umum')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              Guru Umum
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Guru yang merangkap bisa dicentang keduanya (mengajar mapel umum & jurusan).</p>
        </div>

        {/* Jurusan Selection - hanya tampil jika guru bertipe Jurusan */}
        {form.jenis_guru.includes('Jurusan') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan</label>
            <select
              value={form.id_jurusan || ''}
              onChange={e => set('id_jurusan', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={form.jenis_guru.includes('Jurusan')}
            >
              <option value="">Pilih Jurusan...</option>
              {jurusanList.map(j => (
                <option key={j.id_jurusan} value={j.id_jurusan}>
                  {j.nama_jurusan} ({j.id_jurusan})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Pilih jurusan yang diasuh guru ini. Guru dapat mengajar di multiple jurusan dengan menambah kontrak terpisah.
            </p>
          </div>
        )}

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
