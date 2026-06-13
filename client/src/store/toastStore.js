import { create } from 'zustand';

let nextId = 1;

const useToastStore = create((set, get) => ({
  toasts: [],

  /**
   * Add a toast. Auto-removes after `duration` ms (default 4000).
   * variant: 'info' | 'success' | 'warning' | 'danger'
   */
  push: (message, variant = 'info', duration = 4000) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, message, variant }] });
    if (duration) {
      setTimeout(() => get().remove(id), duration);
    }
    return id;
  },

  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  clear: () => set({ toasts: [] }),
}));

export default useToastStore;
