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

  // ── Complete task ──────────────────────────────────────────────────────────
  completeTask: async (roomId) => {
    set({ actionLoading: true, error: null });
    try {
      const { data } = await taskService.completeTask(roomId);
      get()._applyStatusUpdate(roomId, data.userId, true, data.completedAt);
      if (data.activity) get()._prependActivity(data.activity);
      set({ actionLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete task.';
      set({ actionLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Reopen task ────────────────────────────────────────────────────────────
  reopenTask: async (roomId) => {
    set({ actionLoading: true, error: null });
    try {
      const { data } = await taskService.reopenTask(roomId);
      get()._applyStatusUpdate(roomId, data.userId, false, null);
      if (data.activity) get()._prependActivity(data.activity);
      set({ actionLoading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reopen task.';
      set({ actionLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Socket-driven updates (called by useSocket hook) ──────────────────────
  handleTaskCompleted: (payload) => {
    get()._applyStatusUpdate(payload.roomId, payload.userId, true, payload.completedAt);
    if (payload.activity) get()._prependActivity(payload.activity);
  },

  handleTaskReopened: (payload) => {
    get()._applyStatusUpdate(payload.roomId, payload.userId, false, null);
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
}));

export default useRoomStore;
