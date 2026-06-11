import { create } from 'zustand';
import { authService } from '../services/authService';

const useAuthStore = create((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('tf_user')); } catch { return null; }
  })(),
  token: localStorage.getItem('tf_token') || null,
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────────────────
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authService.login({ username, password });
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      set({ loading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  register: async (username, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authService.register({ username, password, displayName });
      localStorage.setItem('tf_token', data.token);
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      set({ loading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('tf_token');
    localStorage.removeItem('tf_user');
    set({ user: null, token: null, error: null });
  },

  refreshUser: async () => {
    try {
      const { data } = await authService.getMe();
      localStorage.setItem('tf_user', JSON.stringify(data.user));
      set({ user: data.user });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),

  isAdmin: () => get().user?.role === 'admin',
  isAuthenticated: () => !!get().token && !!get().user,
}));

export default useAuthStore;
