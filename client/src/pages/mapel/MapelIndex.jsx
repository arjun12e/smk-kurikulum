import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const BADGE = {
  Produktif: 'bg-red-100 text-red-700',
  Umum: 'bg-blue-100 text-blue-700',
  'Pelajaran Kejuruan': 'bg-purple-100 text-purple-700',
  'Muatan Lokal': 'bg-yellow-100 text-yellow-700',
  'Bimbingan dan Konseling': 'bg-pink-100 text-pink-700',
};

export default function MapelIndex() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [kategori, setKategori] = useState('');

  const load = () => {
    const params = {};
    if (search) params.search = search;
    if (kategori) params.kategori = kategori;
    api.get('/mata-pelajaran', { params }).then(r => setData(r.data));
  };

  useEffect(() => { load(); }, [search, kategori]);

  const hapus = async id => {
    if (!confirm('Hapus mata pelajaran ini?')) return;
    try {
      await api.delete(`/mata-pelajaran/${id}`);
      toast.success('Mata pelajaran berhasil dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Mata Pelajaran</h2>
        <Link to="/mata-pelajaran/tambah" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#162d4a]">+ Tambah</Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input placeholder="Cari nama mapel..." value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={kategori} onChange={e => setKategori(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Kategori</option>
          <option>Produktif</option><option>Umum</option><option>Pelajaran Kejuruan</option>
          <option>Muatan Lokal</option><option>Bimbingan dan Konseling</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nama Mapel</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Tingkat</th>
              <th className="px-4 py-3 text-left">Guru Pengampu</th>
              <th className="px-4 py-3 text-left">Jurusan</th>
              <th className="px-4 py-3 text-center">Alokasi/Minggu</th>
              <th className="px-4 py-3 text-center">JP Diluar</th>
              <th className="px-4 py-3 text-center">Total JP</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(m => (
              <tr key={m.id_mapel} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{m.id_mapel}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{m.nama_mapel}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE[m.kategori_mapel]}`}>{m.kategori_mapel}</span></td>
                <td className="px-4 py-3 font-medium text-gray-800">{m.tingkat}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{m.jenis_guru}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{m.id_jurusan}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  <span className="font-medium">{m.alokasi_per_minggu ?? '-'}</span>
                  <span className="text-xs text-gray-400 ml-1">JP</span>
                </td>
                <td className="px-4 py-3 text-center text-gray-700">
                  <span className="font-medium">{m.jp_diluar ?? '-'}</span>
                  <span className="text-xs text-gray-400 ml-1">JP</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-semibold text-[#1e3a5f]">{m.total_jumlah_jp ?? '-'}</span>
                  <span className="text-xs text-gray-400 ml-1">JP</span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/mata-pelajaran/${m.id_mapel}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(m.id_mapel)} className="text-red-500 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
