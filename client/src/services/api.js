import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Fire a custom event so App.jsx can show the SessionExpiredModal
      // instead of a jarring hard redirect. The modal will handle logout + navigate.
      window.dispatchEvent(new CustomEvent('tf:session-expired'));
    }
    return Promise.reject(err);
  }
);

export default api;
