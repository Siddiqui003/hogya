const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET) {
  throw new Error('JWT_SECRET environment variable is not set');
}

/**
 * Sign a JWT for a user.
 * @param {Object} payload - { id, username, role }
 * @returns {string} signed JWT
 */
const signToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
};

/**
 * Verify a JWT and return the decoded payload.
 * Throws JsonWebTokenError or TokenExpiredError on failure.
 * @param {string} token
 * @returns {Object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, SECRET);
};

/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null if missing or malformed.
 * @param {string|undefined} authHeader
 * @returns {string|null}
 */
const extractBearer = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return token || null;
};

module.exports = { signToken, verifyToken, extractBearer };
