import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/guru', label: 'Guru', icon: '👨‍🏫' },
  { to: '/mata-pelajaran', label: 'Mata Pelajaran', icon: '📚' },
  { to: '/rombel', label: 'Rombel', icon: '🏫' },
  { to: '/ruangan', label: 'Ruangan', icon: '🚪' },
  { to: '/kontrak-mengajar', label: 'Kontrak Mengajar', icon: '📋' },
  { to: '/jadwal', label: 'Jadwal Optimal', icon: '📅' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e3a5f] text-white flex flex-col">
        <div className="p-4 border-b border-blue-800">
          <p className="text-xs text-blue-300 leading-tight">SMK Pasundan 2 Bandung</p>
          <h1 className="text-sm font-bold leading-tight mt-1">Sistem Informasi Kurikulum</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-blue-200 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="pt-3 mt-3 border-t border-blue-800">
            <NavLink
              to="/jadwal/generate"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
            >
              <span>⚡</span>
              Jalankan Algoritma GA
            </NavLink>
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">SMK Pasundan 2 Bandung — Sistem Kurikulum</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.name} <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{user?.role}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
