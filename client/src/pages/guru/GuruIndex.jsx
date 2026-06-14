import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const BADGE_STATUS = {
  GTY: 'bg-green-100 text-green-700',
  PNS: 'bg-blue-100 text-blue-700',
  GTT: 'bg-gray-100 text-gray-600',
};

export default function GuruIndex() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    api.get('/guru', { params }).then(res => setData(res.data));
  };

  useEffect(() => { load(); }, [search, status]);

  const hapus = async id => {
    if (!confirm('Hapus guru ini?')) return;
    try {
      await api.delete(`/guru/${id}`);
      toast.success('Guru berhasil dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Data Guru</h2>
        <Link to="/guru/tambah" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#162d4a]">
          + Tambah Guru
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          placeholder="Cari nama guru..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Semua Status</option>
          <option>GTY</option>
          <option>PNS</option>
          <option>GTT</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nama Guru</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Jenis</th>
              <th className="px-4 py-3 text-center">Total Jam</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(guru => (
              <tr key={guru.id_guru} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{guru.id_guru}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{guru.nama_guru}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE_STATUS[guru.status_kepegawaian]}`}>
                    {guru.status_kepegawaian}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{Array.isArray(guru.jenis_guru) ? guru.jenis_guru.join(' & ') : guru.jenis_guru}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-gray-800">{guru.total_jam_mengajar ?? '-'}</span>
                  <span className="text-xs text-gray-400 ml-1">JP</span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/guru/${guru.id_guru}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(guru.id_guru)} className="text-red-500 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
