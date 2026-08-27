import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    // 401 dari endpoint login = kredensial salah → biarkan halaman Login yang
    // menampilkan pesannya. Jangan reload, karena reload menghapus notifikasi.
    const dariLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !dariLogin) {
      // 401 dari endpoint lain = sesi kedaluwarsa → keluar & kembali ke Login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
