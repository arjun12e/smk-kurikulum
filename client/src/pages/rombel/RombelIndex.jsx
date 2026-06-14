import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function RombelIndex() {
  const [data, setData] = useState([]);
  const [tingkat, setTingkat] = useState('');

  const load = () => {
    const params = {};
    if (tingkat) params.tingkat = tingkat;
    api.get('/rombel', { params }).then(r => setData(r.data));
  };

  useEffect(() => { load(); }, [tingkat]);

  const hapus = async id => {
    if (!confirm('Hapus rombel ini?')) return;
    try {
      await api.delete(`/rombel/${id}`);
      toast.success('Rombel berhasil dihapus');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Rombel (Kelas)</h2>
        <Link to="/rombel/tambah" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#162d4a]">+ Tambah</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <select value={tingkat} onChange={e => setTingkat(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Tingkat</option><option>X</option><option>XI</option><option>XII</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nama Rombel</th>
              <th className="px-4 py-3 text-left">Tingkat</th>
              <th className="px-4 py-3 text-left">Jurusan</th>
              <th className="px-4 py-3 text-left">Kontrak</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(r => (
              <tr key={r.id_rombel} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{r.id_rombel}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.nama_rombel}</td>
                <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">Kelas {r.tingkat}</span></td>
                <td className="px-4 py-3 text-gray-600">{r.jurusan}</td>
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{r.jumlah_kontrak} kontrak</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/rombel/${r.id_rombel}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(r.id_rombel)} className="text-red-500 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
