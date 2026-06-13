import { create } from 'zustand';
import { roomService } from '../services/roomService';
import { taskService } from '../services/taskService';

const useRoomStore = create((set, get) => ({
  rooms: [],
  currentRoom: null,
  activities: [],
  loading: false,
  actionLoading: false,
  error: null,
  // Tracks members whose UI just changed via socket (for pulse animation)
  recentlyUpdated: {}, // userId -> timestamp

  // ── Fetch all rooms for current user ───────────────────────────────────────
  fetchMyRooms: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await roomService.getMyRooms();
      set({ rooms: data.rooms, loading: false });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to load rooms.' });
    }
  },

  // Re-fetch silently (no loading flicker) — used after reconnect
  refreshMyRooms: async () => {
    try {
      const { data } = await roomService.getMyRooms();
      set({ rooms: data.rooms });
    } catch {
      // silent — next manual action will surface errors
    }
  },

  // ── Fetch single room ──────────────────────────────────────────────────────
  fetchRoom: async (id) => {
    set({ loading: true, error: null });
    try {
      const [roomRes, activityRes] = await Promise.all([
        roomService.getRoomById(id),
        roomService.getRoomActivity(id),
      ]);
      set({
        currentRoom: roomRes.data.room,
        activities: activityRes.data.activities,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.message || 'Failed to load room.' });
    }
  },

  // Re-fetch the current room silently — used after reconnect to catch missed events
  refreshCurrentRoom: async () => {
    const room = get().currentRoom;
    if (!room) return;
    try {
      const [roomRes, activityRes] = await Promise.all([
        roomService.getRoomById(room._id),
        roomService.getRoomActivity(room._id),
      ]);
      set({ currentRoom: roomRes.data.room, activities: activityRes.data.activities });
    } catch {
      // silent
    }
  },

  // ── Complete task (OPTIMISTIC) ─────────────────────────────────────────────
  completeTask: async (roomId, userId) => {
    set({ error: null });

    // 1. Snapshot current state for rollback
    const snapshot = {
      rooms: get().rooms,
      currentRoom: get().currentRoom,
    };

    // 2. Apply optimistic update immediately
    const now = new Date().toISOString();
    get()._applyStatusUpdate(roomId, userId, true, now);
    set({ actionLoading: true });

    // 3. Confirm with server
    try {
      const { data } = await taskService.completeTask(roomId);
      // Reconcile with server's authoritative timestamp
      get()._applyStatusUpdate(roomId, data.userId, true, data.completedAt);
      if (data.activity) get()._prependActivity(data.activity);
      set({ actionLoading: false });
      return { success: true };
    } catch (err) {
      // 4. Roll back on failure
      set({ rooms: snapshot.rooms, currentRoom: snapshot.currentRoom, actionLoading: false });
      const msg = err.response?.data?.message || 'Failed to complete task.';
      set({ error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Reopen task (OPTIMISTIC) ───────────────────────────────────────────────
  reopenTask: async (roomId, userId) => {
    set({ error: null });

    const snapshot = {
      rooms: get().rooms,
      currentRoom: get().currentRoom,
    };

    get()._applyStatusUpdate(roomId, userId, false, null);
    set({ actionLoading: true });

    try {
      const { data } = await taskService.reopenTask(roomId);
      get()._applyStatusUpdate(roomId, data.userId, false, null);
      if (data.activity) get()._prependActivity(data.activity);
      set({ actionLoading: false });
      return { success: true };
    } catch (err) {
      set({ rooms: snapshot.rooms, currentRoom: snapshot.currentRoom, actionLoading: false });
      const msg = err.response?.data?.message || 'Failed to reopen task.';
      set({ error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Socket-driven updates (called by useSocket hook) ──────────────────────
  handleTaskCompleted: (payload) => {
    get()._applyStatusUpdate(payload.roomId, payload.userId, true, payload.completedAt);
    get()._markRecentlyUpdated(payload.userId);
    if (payload.activity) get()._prependActivity(payload.activity);
  },

  handleTaskReopened: (payload) => {
    get()._applyStatusUpdate(payload.roomId, payload.userId, false, null);
    get()._markRecentlyUpdated(payload.userId);
    if (payload.activity) get()._prependActivity(payload.activity);
  },

  handleTaskReset: (payload) => {
    const room = get().currentRoom;
    if (!room || room._id !== payload.roomId) return;
    const updated = {
      ...room,
      members: room.members.map((m) => ({ ...m, isCompleted: false, completedAt: null })),
    };
    set({ currentRoom: updated });
  },

  handleMemberJoined: (payload) => {
    const room = get().currentRoom;
    if (!room || room._id.toString() !== payload.roomId.toString()) return;
    const alreadyExists = room.members.some(
      (m) => m.user._id.toString() === payload.user._id.toString()
    );
    if (!alreadyExists) {
      set({
        currentRoom: {
          ...room,
          members: [...room.members, { user: payload.user, isCompleted: false, completedAt: null }],
        },
      });
    }
  },

  handleMemberLeft: (payload) => {
    const room = get().currentRoom;
    if (!room || room._id.toString() !== payload.roomId.toString()) return;
    set({
      currentRoom: {
        ...room,
        members: room.members.filter(
          (m) => m.user._id.toString() !== payload.userId.toString()
        ),
      },
    });
  },

  clearCurrentRoom: () => set({ currentRoom: null, activities: [] }),
  clearError: () => set({ error: null }),

  // ── Internal helpers ───────────────────────────────────────────────────────
  _applyStatusUpdate: (roomId, userId, isCompleted, completedAt) => {
    const updateMembers = (members) =>
      members.map((m) =>
        m.user._id?.toString() === userId?.toString() || m.user?.toString() === userId?.toString()
          ? { ...m, isCompleted, completedAt }
          : m
      );

    // Update currentRoom
    const room = get().currentRoom;
    if (room && (room._id === roomId || room._id?.toString() === roomId?.toString())) {
      set({ currentRoom: { ...room, members: updateMembers(room.members) } });
    }

    // Update rooms list
    set({
      rooms: get().rooms.map((r) =>
        r._id?.toString() === roomId?.toString()
          ? { ...r, members: updateMembers(r.members), myStatus: { isCompleted, completedAt } }
          : r
      ),
    });
  },

  _prependActivity: (activity) => {
    set({ activities: [activity, ...get().activities].slice(0, 50) });
  },

  // Mark a user as "just updated" for 2 seconds — drives the pulse animation
  _markRecentlyUpdated: (userId) => {
    const id = userId?.toString();
    set({ recentlyUpdated: { ...get().recentlyUpdated, [id]: Date.now() } });
    setTimeout(() => {
      const current = get().recentlyUpdated;
      if (current[id]) {
        const updated = { ...current };
        delete updated[id];
        set({ recentlyUpdated: updated });
      }
    }, 2000);
  },
}));

export default useRoomStore;
