import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';
import useSocketStore from '../store/socketStore';
import useRoomStore from '../store/roomStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * useSocket — creates and manages a single Socket.IO connection for the
 * lifetime of the authenticated session. Call once at the app root level.
 */
export const useSocket = () => {
  const token = useAuthStore((s) => s.token);
  const { setSocket, setConnected } = useSocketStore();
  const { handleTaskCompleted, handleTaskReopened, handleTaskReset,
          handleMemberJoined, handleMemberLeft } = useRoomStore();
  const setOnlineUsers = useSocketStore((s) => s.setOnlineUsers);
  const socketRef = useRef(null);

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

    const socket = io(SOCKET_URL, {
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
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('🔌 Socket connect error:', err.message);
      setConnected(false);
    });

    // Task events
    socket.on('task:completed', handleTaskCompleted);
    socket.on('task:reopened', handleTaskReopened);
    socket.on('task:reset', handleTaskReset);

    // Member events
    socket.on('member:joined', handleMemberJoined);
    socket.on('member:left', handleMemberLeft);

    // Presence
    socket.on('presence:update', ({ roomId, onlineUsers }) => {
      setOnlineUsers(roomId, onlineUsers);
    });

    socket.on('joined_room', ({ roomId, onlineUsers }) => {
      setOnlineUsers(roomId, onlineUsers);
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
