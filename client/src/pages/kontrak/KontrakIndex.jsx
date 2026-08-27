import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const SHIFT = ['Pagi', 'Siang'];
const KASTA_BADGE = { PNS: 'bg-blue-100 text-blue-700', GTY: 'bg-green-100 text-green-700', GTT: 'bg-gray-100 text-gray-600' };
const MAPEL_BADGE = { Produktif: 'bg-red-100 text-red-700', Umum: 'bg-blue-100 text-blue-700', PelajaranKejuruan: 'bg-purple-100 text-purple-700', MuatanLokal: 'bg-yellow-100 text-yellow-700' };

export default function KontrakIndex() {
  const [data, setData] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [warningsRombel, setWarningsRombel] = useState([]);
  const [guruList, setGuruList] = useState([]);
  const [rombelList, setRombelList] = useState([]);
  const [filter, setFilter] = useState({ id_guru: '', id_rombel: '', status_kepegawaian: '' });

  const load = () => {
    const params = {};
    if (filter.id_guru) params.id_guru = filter.id_guru;
    if (filter.id_rombel) params.id_rombel = filter.id_rombel;
    if (filter.status_kepegawaian) params.status_kepegawaian = filter.status_kepegawaian;
    api.get('/kontrak-mengajar', { params }).then(res => {
      setData(res.data.data);
      setWarnings(res.data.warnings);
      setWarningsRombel(res.data.warningsRombel || []);
    });
  };

  useEffect(() => {
    load();
    api.get('/guru').then(r => setGuruList(r.data));
    api.get('/rombel').then(r => setRombelList(r.data));
  }, []);

  useEffect(() => { load(); }, [filter]);

  const hapus = async id => {
    if (!confirm('Hapus kontrak ini?')) return;
    try {
      await api.delete(`/kontrak-mengajar/${id}`);
      toast.success('Kontrak berhasil dihapus');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  };

  const hapusSemuanya = async () => {
    if (data.length === 0) {
      toast.error('Tidak ada kontrak untuk dihapus');
      return;
    }
    
    const confirm_text = `Hapus semua ${data.length} kontrak yang ditampilkan? Tindakan ini tidak dapat dibatalkan.`;
    if (!confirm(confirm_text)) return;
    
    try {
      const ids = data.map(k => k.id_kontrak);
      await Promise.all(ids.map(id => api.delete(`/kontrak-mengajar/${id}`)));
      toast.success(`${ids.length} kontrak berhasil dihapus`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus beberapa kontrak');
    }
  };

  const preferensiRingkas = (pref) => {
    if (!pref) return '-';
    // Support both old format (flat) and new format (with hari/shift)
    const hari = pref.hari || pref;
    const shift = pref.shift || {};
    
    const hariStr = HARI.map(h => `${h.slice(0, 3)}:${hari[h] || 3}`).join(' ');
    const shiftStr = SHIFT.map(s => `${s}:${shift[s] || 3}`).join(' ');
    
    return (
      <div>
        <div className="text-xs text-gray-500 mb-1">{hariStr}</div>
        <div className="text-xs text-orange-500">{shiftStr}</div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Kontrak Mengajar</h2>
        <div className="flex gap-2">
          {data.length > 0 && (
            <button 
              onClick={hapusSemuanya}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
              Hapus Semua ({data.length})
            </button>
          )}
          <Link to="/kontrak-mengajar/tambah" className="bg-[#1e3a5f] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#162d4a]">
            + Tambah Kontrak
          </Link>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
          ⚠️ <strong>Peringatan — melebihi jatah JP guru:</strong>{' '}
          {warnings.map(w => `${w.nama_guru || w.id_guru} (${w.total_jp}/${w.batas} JP)`).join(', ')}
        </div>
      )}

      {warningsRombel.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-sm text-orange-700">
          ⚠️ <strong>Rombel melebihi jatah JP per minggu (Settings):</strong>{' '}
          {warningsRombel.map(w => `${w.nama_rombel} (${w.total_jp}/${w.batas} JP)`).join(', ')}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3 flex-wrap">
        <select value={filter.id_guru} onChange={e => setFilter(f => ({ ...f, id_guru: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Guru</option>
          {guruList.map(g => <option key={g.id_guru} value={g.id_guru}>{g.nama_guru}</option>)}
        </select>
        <select value={filter.id_rombel} onChange={e => setFilter(f => ({ ...f, id_rombel: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Rombel</option>
          {rombelList.map(r => <option key={r.id_rombel} value={r.id_rombel}>{r.nama_rombel}</option>)}
        </select>
        <select value={filter.status_kepegawaian} onChange={e => setFilter(f => ({ ...f, status_kepegawaian: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Semua Kasta</option>
          <option>PNS</option><option>P3K</option><option>Honorer</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Guru</th>
              <th className="px-4 py-3 text-left">Mata Pelajaran</th>
              <th className="px-4 py-3 text-left">Rombel</th>
              <th className="px-4 py-3 text-left">JP</th>
              <th className="px-4 py-3 text-left">Preferensi (Hari / Sesi)</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(k => (
              <tr key={k.id_kontrak} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{k.Guru?.nama_guru}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${KASTA_BADGE[k.Guru?.status_kepegawaian]}`}>{k.Guru?.status_kepegawaian}</span>
                </td>
                <td className="px-4 py-3">
                  <div>{k.MataPelajaran?.nama_mapel}</div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${MAPEL_BADGE[k.MataPelajaran?.kategori_mapel]}`}>{k.MataPelajaran?.kategori_mapel}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {k.Rombel?.nama_rombel}
                  {(k.Rombel?.is_pkl || k.is_pkl) && <span className="ml-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">PKL</span>}
                </td>
                <td className="px-4 py-3 font-bold text-gray-800">{k.jumlah_jp}</td>
                <td className="px-4 py-3 font-mono text-xs">{preferensiRingkas(k.preferensi_hari)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={`/kontrak-mengajar/${k.id_kontrak}/edit`} className="text-blue-600 hover:underline">Edit</Link>
                  <button onClick={() => hapus(k.id_kontrak)} className="text-red-500 hover:underline">Hapus</button>
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
