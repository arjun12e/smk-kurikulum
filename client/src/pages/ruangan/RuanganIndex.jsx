import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const BADGE = { Teori: 'bg-gray-100 text-gray-600', Lab: 'bg-green-100 text-green-700', Bengkel: 'bg-orange-100 text-orange-700' };

export default function RuanganIndex() {
  const [data, setData] = useState([]);
  const [jenis, setJenis] = useState('');
  const [mapelMap, setMapelMap] = useState({});

  const load = () => {
    const params = {};
    if (jenis) params.jenis = jenis;
    api.get('/ruangan', { params }).then(r => setData(r.data));
  };

  useEffect(() => { load(); }, [jenis]);
  useEffect(() => {
    api.get('/mata-pelajaran').then(r => {
      const m = {};
      r.data.forEach(x => { m[x.id_mapel] = x.nama_mapel; });
      setMapelMap(m);
    }).catch(() => {});
  }, []);

  const mapelDariRuangan = (r) =>
    Array.isArray(r.id_mapel_list) ? r.id_mapel_list : (r.id_mapel_list ? String(r.id_mapel_list).split(',').map(s => s.trim()).filter(Boolean) : []);

  const hapus = async id => {
    if (!confirm('Hapus ruangan ini?')) return;
    try { await api.delete(`/ruangan/${id}`); toast.success('Ruangan dihapus'); load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Ruangan</h2>
        <Link to="/ruangan/tambah" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#162d4a]">+ Tambah</Link>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <select value={jenis} onChange={e => setJenis(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Jenis</option><option>Teori</option><option>Lab</option><option>Bengkel</option>
        </select>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Nama Ruangan</th>
              <th className="px-4 py-3 text-left">Jenis</th>
              <th className="px-4 py-3 text-left">Mapel di Ruangan Ini</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(r => (
              <tr key={r.id_ruangan} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{r.id_ruangan}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{r.nama_ruangan}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${BADGE[r.jenis_ruangan]}`}>{r.jenis_ruangan}</span></td>
                <td className="px-4 py-3">
                  {r.jenis_ruangan === 'Teori' ? (
                    <span className="text-xs text-gray-400">Mapel umum (bebas)</span>
                  ) : mapelDariRuangan(r).length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {mapelDariRuangan(r).map(idm => (
                        <span key={idm} className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs" title={idm}>
                          {mapelMap[idm] || idm}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">{r.id_jurusan ? `Semua produktif ${r.id_jurusan}` : 'Belum diatur'}</span>
                  )}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/ruangan/${r.id_ruangan}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(r.id_ruangan)} className="text-red-500 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
