import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function JurusanIndex() {
  const [jurusanList, setJurusanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id_jurusan: '', nama_jurusan: '' });

  useEffect(() => {
    loadJurusan();
  }, []);

  const loadJurusan = async () => {
    try {
      const res = await api.get('/jurusan');
      setJurusanList(res.data);
    } catch (err) {
      toast.error('Gagal memuat data jurusan');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (jurusan = null) => {
    if (jurusan) {
      setEditingId(jurusan.id_jurusan);
      setForm({ id_jurusan: jurusan.id_jurusan, nama_jurusan: jurusan.nama_jurusan });
    } else {
      setEditingId(null);
      setForm({ id_jurusan: '', nama_jurusan: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.id_jurusan || !form.nama_jurusan) {
      toast.error('Semua field wajib diisi');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/jurusan/${editingId}`, form);
        toast.success('Jurusan berhasil diperbarui');
      } else {
        await api.post('/jurusan', form);
        toast.success('Jurusan berhasil ditambahkan');
      }
      loadJurusan();
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Hapus jurusan ini?')) return;
    try {
      await api.delete(`/jurusan/${id}`);
      toast.success('Jurusan berhasil dihapus');
      loadJurusan();
    } catch (err) {
      toast.error('Gagal menghapus jurusan');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Jurusan</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
        >
          + Tambah Jurusan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ID Jurusan</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nama Jurusan</th>
              <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {jurusanList.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                  Tidak ada data jurusan
                </td>
              </tr>
            ) : (
              jurusanList.map(j => (
                <tr key={j.id_jurusan} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{j.id_jurusan}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{j.nama_jurusan}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openModal(j)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(j.id_jurusan)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingId ? 'Edit Jurusan' : 'Tambah Jurusan Baru'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Jurusan
                </label>
                <input
                  type="text"
                  value={form.id_jurusan}
                  onChange={e => setForm({ ...form, id_jurusan: e.target.value })}
                  disabled={editingId !== null}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g., TAV"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Jurusan
                </label>
                <input
                  type="text"
                  value={form.nama_jurusan}
                  onChange={e => setForm({ ...form, nama_jurusan: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Teknik Audio Video"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
