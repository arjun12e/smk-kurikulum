import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('admin@smkpasundan2.sch.id');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);   // { message, field }
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      toast.success('Berhasil masuk');
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      const pesan = data?.message
        || (err.response ? 'Login gagal' : 'Tidak dapat terhubung ke server');
      setError({ message: pesan, field: data?.field });
      toast.error(pesan);
    } finally {
      setLoading(false);
    }
  };

  // Hapus pesan galat begitu pengguna mulai memperbaiki isian
  const ubahEmail = v => { setEmail(v); if (error) setError(null); };
  const ubahPassword = v => { setPassword(v); if (error) setError(null); };

  return (
    <div className="min-h-screen bg-[#1e3a5f] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">
            <img src="/logo-pas1.png" alt="Logo SMK Pasundan 2" className="mx-auto w-20 h-20" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">SMK Pasundan 2 Bandung</h1>
          <p className="text-sm text-gray-500 mt-1">Sistem Informasi Manajemen Kurikulum</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 bg-red-50 border border-red-300 rounded-lg px-3 py-2.5">
            <span className="text-red-600 leading-none mt-0.5">⚠️</span>
            <div className="text-sm text-red-700">
              <strong>{error.message}</strong>
              <div className="text-xs text-red-600 mt-0.5">
                {error.field === 'email' && 'Periksa kembali alamat email Anda.'}
                {error.field === 'password' && 'Periksa kembali kata sandi Anda.'}
                {!error.field && 'Silakan coba lagi.'}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => ubahEmail(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                error?.field === 'email'
                  ? 'border-red-400 bg-red-50 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => ubahPassword(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                error?.field === 'password'
                  ? 'border-red-400 bg-red-50 focus:ring-red-400'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3a5f] hover:bg-[#162d4a] text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
