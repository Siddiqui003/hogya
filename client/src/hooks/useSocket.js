import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import useRoomStore from '../store/roomStore';
import useToastStore from '../store/toastStore';

// If VITE_SOCKET_URL is unset, Socket.IO defaults to the page's own origin
// (correct for same-origin deployments). For local dev we explicitly point
// at the backend on port 5000.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL !== undefined
  ? import.meta.env.VITE_SOCKET_URL
  : 'http://localhost:5000';

/**
 * useSocket — creates and manages a single Socket.IO connection for the
 * lifetime of the authenticated session. Call once at the app root level.
 */
export const useSocket = () => {
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const { setSocket, setConnected } = useSocketStore();
  const { handleTaskCompleted, handleTaskReopened, handleTaskReset,
          handleMemberJoined, handleMemberLeft, refreshCurrentRoom,
          refreshMyRooms } = useRoomStore();
  const setOnlineUsers = useSocketStore((s) => s.setOnlineUsers);
  const pushToast = useToastStore((s) => s.push);
  const socketRef = useRef(null);
  const wasConnectedBefore = useRef(false);

  useEffect(() => {
    if (!token) {
      // Clean up on logout
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Don't double-connect
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL || undefined, {
      auth: { token: `Bearer ${token}` },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    setSocket(socket);

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      setConnected(true);

      // If this is a RECONNECT (not the first connection), silently
      // re-fetch room data to catch any events missed while offline.
      if (wasConnectedBefore.current) {
        refreshMyRooms();
        refreshCurrentRoom();
      }
      wasConnectedBefore.current = true;
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connect error:', err.message);
      setConnected(false);
    });

    // ── Task events ─────────────────────────────────────────────────────────
    socket.on('task:completed', (payload) => {
      handleTaskCompleted(payload);

      // Don't toast your own action — you already got immediate feedback
      const isMe = payload.userId === currentUser?._id?.toString();
      if (!isMe) {
        const name = payload.user?.displayName || payload.user?.username || 'Someone';
        pushToast(`${name} completed the task ✓`, 'success');
      }
    });

    socket.on('task:reopened', (payload) => {
      handleTaskReopened(payload);
      const isMe = payload.userId === currentUser?._id?.toString();
      if (!isMe) {
        const name = payload.user?.displayName || payload.user?.username || 'Someone';
        pushToast(`${name} reopened their task`, 'info');
      }
    });

    socket.on('task:reset', (payload) => {
      handleTaskReset(payload);
      pushToast('An admin reset all task statuses in this room', 'warning');
    });

    // ── Member events ───────────────────────────────────────────────────────
    socket.on('member:joined', (payload) => {
      handleMemberJoined(payload);
      const name = payload.user?.displayName || payload.user?.username || 'Someone';
      pushToast(`${name} joined the room`, 'info');
    });

    socket.on('member:left', (payload) => {
      handleMemberLeft(payload);
      pushToast('A member left the room', 'info');
    });

    // ── Presence ─────────────────────────────────────────────────────────────
    socket.on('presence:update', ({ roomId, onlineUsers }) => {
      setOnlineUsers(roomId, onlineUsers);
    });

    socket.on('joined_room', ({ roomId, onlineUsers }) => {
      setOnlineUsers(roomId, onlineUsers);
    });

    socket.on('error', ({ message }) => {
      pushToast(message || 'A real-time error occurred.', 'danger');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
};

/**
 * useRoomSocket — join/leave a specific room channel.
 * Call inside a room page component.
 */
export const useRoomSocket = (roomId) => {
  const socket = useSocketStore((s) => s.socket);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.emit('join_room', { roomId });

    return () => {
      socket.emit('leave_room', { roomId });
    };
  }, [socket, roomId]);
};
