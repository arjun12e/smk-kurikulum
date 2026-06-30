import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import GuruIndex from './pages/guru/GuruIndex';
import GuruForm from './pages/guru/GuruForm';
import MapelIndex from './pages/mapel/MapelIndex';
import MapelForm from './pages/mapel/MapelForm';
import RombelIndex from './pages/rombel/RombelIndex';
import RombelForm from './pages/rombel/RombelForm';
import RuanganIndex from './pages/ruangan/RuanganIndex';
import RuanganForm from './pages/ruangan/RuanganForm';
import KontrakIndex from './pages/kontrak/KontrakIndex';
import KontrakForm from './pages/kontrak/KontrakForm';
import JadwalIndex from './pages/jadwal/JadwalIndex';
import JadwalGenerate from './pages/jadwal/JadwalGenerate';
import JadwalInsight from './pages/jadwal/JadwalInsight';
import KalenderGuru from './pages/jadwal/KalenderGuru';
import JurusanIndex from './pages/JurusanIndex';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="/guru" element={<ProtectedRoute><GuruIndex /></ProtectedRoute>} />
      <Route path="/guru/tambah" element={<ProtectedRoute><GuruForm /></ProtectedRoute>} />
      <Route path="/guru/:id/edit" element={<ProtectedRoute><GuruForm /></ProtectedRoute>} />

      <Route path="/mata-pelajaran" element={<ProtectedRoute><MapelIndex /></ProtectedRoute>} />
      <Route path="/mata-pelajaran/tambah" element={<ProtectedRoute><MapelForm /></ProtectedRoute>} />
      <Route path="/mata-pelajaran/:id/edit" element={<ProtectedRoute><MapelForm /></ProtectedRoute>} />

      <Route path="/rombel" element={<ProtectedRoute><RombelIndex /></ProtectedRoute>} />
      <Route path="/rombel/tambah" element={<ProtectedRoute><RombelForm /></ProtectedRoute>} />
      <Route path="/rombel/:id/edit" element={<ProtectedRoute><RombelForm /></ProtectedRoute>} />

      <Route path="/ruangan" element={<ProtectedRoute><RuanganIndex /></ProtectedRoute>} />
      <Route path="/ruangan/tambah" element={<ProtectedRoute><RuanganForm /></ProtectedRoute>} />
      <Route path="/ruangan/:id/edit" element={<ProtectedRoute><RuanganForm /></ProtectedRoute>} />

      <Route path="/kontrak-mengajar" element={<ProtectedRoute><KontrakIndex /></ProtectedRoute>} />
      <Route path="/kontrak-mengajar/tambah" element={<ProtectedRoute><KontrakForm /></ProtectedRoute>} />
      <Route path="/kontrak-mengajar/:id/edit" element={<ProtectedRoute><KontrakForm /></ProtectedRoute>} />

      <Route path="/jadwal" element={<ProtectedRoute><JadwalIndex /></ProtectedRoute>} />
      <Route path="/jadwal/generate" element={<ProtectedRoute><JadwalGenerate /></ProtectedRoute>} />
      <Route path="/jadwal/insight" element={<ProtectedRoute><JadwalInsight /></ProtectedRoute>} />
      <Route path="/jadwal/kalender-guru" element={<ProtectedRoute><KalenderGuru /></ProtectedRoute>} />

      <Route path="/jurusan" element={<ProtectedRoute><JurusanIndex /></ProtectedRoute>} />

      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
