import { create } from 'zustand';

const useSocketStore = create((set, get) => ({
  socket: null,
  connected: false,
  // roomId → [{ userId, username, displayName }]
  onlineUsers: {},

  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),

  setOnlineUsers: (roomId, users) =>
    set({ onlineUsers: { ...get().onlineUsers, [roomId]: users } }),

  getOnlineUsers: (roomId) => get().onlineUsers[roomId] || [],

  clearRoom: (roomId) => {
    const { onlineUsers } = get();
    const updated = { ...onlineUsers };
    delete updated[roomId];
    set({ onlineUsers: updated });
  },
}));

export default useSocketStore;
