import axios from 'axios';
import { pushLog } from '../components/ApiLogPanel';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

// ── Request: stamp start time ─────────────────────────────────────────────────
api.interceptors.request.use(config => {
  config.metadata = { start: Date.now() };
  return config;
});

// ── Response: log success ─────────────────────────────────────────────────────
api.interceptors.response.use(
  res => {
    pushLog({
      status: res.status,
      method: res.config.method?.toUpperCase(),
      url: res.config.url,
      ms: Date.now() - (res.config.metadata?.start ?? Date.now()),
      data: res.data,
    });
    return res;
  },
  err => {
    const res = err.response;
    pushLog({
      status: res?.status ?? 'ERR',
      method: err.config?.method?.toUpperCase(),
      url: err.config?.url,
      ms: Date.now() - (err.config?.metadata?.start ?? Date.now()),
      error: res?.data ? JSON.stringify(res.data) : err.message,
    });

    if (res?.status === 401 || res?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
