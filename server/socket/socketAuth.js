const { verifyToken, extractBearer } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Socket.IO middleware — runs before the 'connection' event.
 * Attaches socket.user if the JWT is valid, otherwise disconnects.
 *
 * Client must send the token in the handshake auth object:
 *   const socket = io(URL, { auth: { token: 'Bearer <jwt>' } })
 * or as a query param:
 *   const socket = io(URL, { query: { token: '<jwt>' } })
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Accept token from auth object or query string
    const raw =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      (socket.handshake.query?.token
        ? `Bearer ${socket.handshake.query.token}`
        : null);

    const token = extractBearer(raw);

    if (!token) {
      return next(new Error('SOCKET_AUTH: No token provided.'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return next(
        new Error(
          err.name === 'TokenExpiredError'
            ? 'SOCKET_AUTH: Token expired.'
            : 'SOCKET_AUTH: Invalid token.'
        )
      );
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return next(new Error('SOCKET_AUTH: User not found or inactive.'));
    }

    // Attach user to socket for use in all event handlers
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('SOCKET_AUTH: Authentication error.'));
  }
};

module.exports = socketAuthMiddleware;
