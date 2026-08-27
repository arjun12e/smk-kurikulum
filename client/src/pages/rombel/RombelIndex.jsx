import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HP = { Senin: 'Sen', Selasa: 'Sel', Rabu: 'Rab', Kamis: 'Kam', Jumat: 'Jum', Sabtu: 'Sab' };
// Ringkas sesi-per-hari: kelompokkan hari berurutan dengan sesi sama.
function ringkasSesi(r) {
  const sh = r.sesi_hari && typeof r.sesi_hari === 'object' ? r.sesi_hari : {};
  const def = r.sesi || 'Pagi';
  const perHari = HARI.map(h => sh[h] || def);
  if (perHari.every(s => s === perHari[0])) return [{ sesi: perHari[0], label: 'Semua' }];
  const grup = [];
  HARI.forEach((h, i) => {
    const s = perHari[i];
    const last = grup[grup.length - 1];
    if (last && last.sesi === s) last.hari.push(HP[h]);
    else grup.push({ sesi: s, hari: [HP[h]] });
  });
  return grup.map(g => ({ sesi: g.sesi, label: `${g.hari[0]}${g.hari.length > 1 ? '–' + g.hari[g.hari.length - 1] : ''}` }));
}
const SESI_STYLE = { Pagi: 'bg-sky-100 text-sky-700', Siang: 'bg-orange-100 text-orange-700', Libur: 'bg-gray-100 text-gray-500' };

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

  const togglePkl = async (r) => {
    try {
      await api.put(`/rombel/${r.id_rombel}`, {
        nama_rombel: r.nama_rombel, tingkat: r.tingkat, jurusan: r.jurusan, is_pkl: !r.is_pkl,
      });
      setData(prev => prev.map(x => x.id_rombel === r.id_rombel ? { ...x, is_pkl: !x.is_pkl } : x));
    } catch (err) { toast.error('Gagal mengubah status PKL'); }
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
              <th className="px-4 py-3 text-left">Sesi</th>
              <th className="px-4 py-3 text-center">PKL</th>
              <th className="px-4 py-3 text-left">Kontrak</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(r => (
              <tr key={r.id_rombel} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">{r.id_rombel}</td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {r.nama_rombel}
                  {r.is_pkl && <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">PKL</span>}
                </td>
                <td className="px-4 py-3"><span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs">Kelas {r.tingkat}</span></td>
                <td className="px-4 py-3 text-gray-600">{r.jurusan}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {ringkasSesi(r).map((g, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${SESI_STYLE[g.sesi] || SESI_STYLE.Pagi}`}>
                        {g.sesi}{g.label !== 'Semua' ? ` ${g.label}` : ''}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <input type="checkbox" checked={!!r.is_pkl} onChange={() => togglePkl(r)}
                    title="Tandai rombel sedang PKL" className="w-4 h-4 accent-amber-600 cursor-pointer" />
                </td>
                <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{r.jumlah_kontrak} kontrak</span></td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/rombel/${r.id_rombel}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(r.id_rombel)} className="text-red-500 hover:underline">Hapus</button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
