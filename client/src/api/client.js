import axios from 'axios';

// Normalize the API base so it always ends in "/api", regardless of whether
// VITE_API_URL is "https://host", "https://host/", or "https://host/api"
// (handles Vercel dashboard vs .env.production differences). Backend mounts
// everything under /api.
const rawBase = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');
export const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach JWT (and the "view as" header for super-admin impersonation) on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const viewAsId = localStorage.getItem('viewAsId');
  if (viewAsId) config.headers['X-View-As'] = viewAsId;
  return config;
});

// Normalize errors and handle 401s globally.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || err.message || 'Something went wrong';
    if (status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
