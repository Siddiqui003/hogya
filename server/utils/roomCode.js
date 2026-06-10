const Room = require('../models/Room');

/**
 * Generate a unique random room code (6 uppercase alphanumeric chars).
 * Retries up to maxAttempts times to avoid collisions.
 */
const generateRoomCode = async (length = 6, maxAttempts = 10) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit O,0,I,1 (visually ambiguous)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const exists = await Room.findOne({ code });
    if (!exists) return code;
  }

  throw new Error('Could not generate a unique room code. Try again.');
};

module.exports = { generateRoomCode };
