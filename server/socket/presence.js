/**
 * In-memory presence store.
 *
 * Structure:
 *   roomPresence: Map<roomId, Map<userId, { socketId, username, displayName, joinedAt }>>
 *
 * A single user can have multiple socket connections (tabs), so we track by
 * socketId internally but expose a deduplicated user list to clients.
 *
 * This is intentionally in-memory (not Redis) for the MVP. For multi-server
 * deployments, swap this out for a Redis adapter + Redis Sets.
 */

// roomId → Map<socketId, userInfo>
const roomPresence = new Map();

const presence = {
  /**
   * Add a socket to a room's presence list.
   */
  add(roomId, socketId, user) {
    if (!roomPresence.has(roomId)) {
      roomPresence.set(roomId, new Map());
    }
    roomPresence.get(roomId).set(socketId, {
      socketId,
      userId: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      joinedAt: new Date(),
    });
  },

  /**
   * Remove a socket from all rooms it was in.
   * Returns an array of roomIds that were affected.
   */
  remove(socketId) {
    const affectedRooms = [];
    for (const [roomId, sockets] of roomPresence.entries()) {
      if (sockets.has(socketId)) {
        sockets.delete(socketId);
        affectedRooms.push(roomId);
        // Clean up empty room entries
        if (sockets.size === 0) roomPresence.delete(roomId);
      }
    }
    return affectedRooms;
  },

  /**
   * Remove a socket from a specific room.
   */
  removeFromRoom(roomId, socketId) {
    const sockets = roomPresence.get(roomId);
    if (!sockets) return;
    sockets.delete(socketId);
    if (sockets.size === 0) roomPresence.delete(roomId);
  },

  /**
   * Get deduplicated list of online users in a room.
   * If the same user has 2 tabs open, they appear once.
   */
  getUsers(roomId) {
    const sockets = roomPresence.get(roomId);
    if (!sockets) return [];

    const seen = new Set();
    const users = [];
    for (const info of sockets.values()) {
      if (!seen.has(info.userId)) {
        seen.add(info.userId);
        users.push({
          userId: info.userId,
          username: info.username,
          displayName: info.displayName,
        });
      }
    }
    return users;
  },

  /**
   * Is a specific user currently online in a room?
   */
  isOnline(roomId, userId) {
    const sockets = roomPresence.get(roomId);
    if (!sockets) return false;
    for (const info of sockets.values()) {
      if (info.userId === userId.toString()) return true;
    }
    return false;
  },

  /**
   * How many unique users are online in a room?
   */
  count(roomId) {
    return this.getUsers(roomId).length;
  },
};

module.exports = presence;
