const socketAuthMiddleware = require('./socketAuth');
const presence = require('./presence');
const Room = require('../models/Room');

/**
 * All Socket.IO events used in this application
 * ─────────────────────────────────────────────
 *
 * CLIENT → SERVER:
 *   join_room    { roomId }          — subscribe to a room's updates
 *   leave_room   { roomId }          — unsubscribe
 *   ping                             — keepalive / latency check
 *
 * SERVER → CLIENT:
 *   joined_room  { roomId, onlineUsers }          — ack after joining
 *   left_room    { roomId }                        — ack after leaving
 *   task:completed  { roomId, userId, user, isCompleted, completedAt, activity }
 *   task:reopened   { roomId, userId, user, isCompleted, completedAt, activity }
 *   task:reset      { roomId }
 *   member:joined   { roomId, user }
 *   member:left     { roomId, userId }
 *   presence:update { roomId, onlineUsers, count }
 *   error           { message }
 *   pong            { timestamp }
 */

const initializeSocket = (io) => {
  // ── Auth middleware (runs before every connection) ──────────────────────────
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 [Socket] Connected — ${user.username} (${socket.id})`);

    // ── join_room ─────────────────────────────────────────────────────────────
    socket.on('join_room', async ({ roomId } = {}) => {
      try {
        if (!roomId) {
          return socket.emit('error', { message: 'roomId is required.' });
        }

        // Verify the user is actually a member of this room
        const room = await Room.findOne({
          _id: roomId,
          isActive: true,
          'members.user': user._id,
        });

        // Admins can observe any room even without membership
        const isAdmin = user.role === 'admin';
        if (!room && !isAdmin) {
          return socket.emit('error', {
            message: 'Room not found or you are not a member.',
          });
        }

        // If admin but room doesn't exist at all, still check it exists
        if (!room) {
          const roomExists = await Room.findOne({ _id: roomId, isActive: true });
          if (!roomExists) {
            return socket.emit('error', { message: 'Room not found.' });
          }
        }

        // Subscribe socket to the Socket.IO room channel
        socket.join(roomId);

        // Track presence
        presence.add(roomId, socket.id, user);

        const onlineUsers = presence.getUsers(roomId);

        // Ack to the joining client
        socket.emit('joined_room', { roomId, onlineUsers });

        // Broadcast updated presence to everyone else in the room
        socket.to(roomId).emit('presence:update', {
          roomId,
          onlineUsers,
          count: onlineUsers.length,
        });

        console.log(
          `   📥 ${user.username} joined room ${roomId} (${onlineUsers.length} online)`
        );
      } catch (err) {
        console.error('[Socket] join_room error:', err.message);
        socket.emit('error', { message: 'Failed to join room.' });
      }
    });

    // ── leave_room ────────────────────────────────────────────────────────────
    socket.on('leave_room', ({ roomId } = {}) => {
      if (!roomId) return;

      socket.leave(roomId);
      presence.removeFromRoom(roomId, socket.id);

      const onlineUsers = presence.getUsers(roomId);

      socket.emit('left_room', { roomId });

      io.to(roomId).emit('presence:update', {
        roomId,
        onlineUsers,
        count: onlineUsers.length,
      });

      console.log(
        `   📤 ${user.username} left room ${roomId} (${onlineUsers.length} online)`
      );
    });

    // ── ping / pong ───────────────────────────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(
        `🔌 [Socket] Disconnected — ${user.username} (${socket.id}) reason: ${reason}`
      );

      // Remove from all rooms and broadcast presence updates
      const affectedRooms = presence.remove(socket.id);

      for (const roomId of affectedRooms) {
        const onlineUsers = presence.getUsers(roomId);
        io.to(roomId).emit('presence:update', {
          roomId,
          onlineUsers,
          count: onlineUsers.length,
        });
      }
    });

    // ── error handler (catches malformed events) ──────────────────────────────
    socket.on('error', (err) => {
      console.error(`[Socket] Error from ${user.username}:`, err.message);
    });
  });

  console.log('✅ Socket.IO handlers initialized');
};

module.exports = initializeSocket;
