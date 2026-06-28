import axios from 'axios';
import { getDateRange } from './dateRange';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// Table routes show ALL records regardless of the global date picker
const DATE_EXEMPT = ['/auth/', '/settings/', '/data/drafts', '/data/applied', '/data/registered', '/data/export'];
api.interceptors.request.use(config => {
  const exempt = DATE_EXEMPT.some(p => (config.url || '').includes(p));
  if (!exempt) {
    const { from, to } = getDateRange();
    config.params = { from, to, ...config.params };
  }
  return config;
});

// ── Response: handle auth errors ──────────────────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const res = err.response;
    if (res?.status === 401 || res?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
