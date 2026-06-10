const User = require('../models/User');
const { verifyToken, extractBearer } = require('../utils/jwt');
const { sendError } = require('../utils/response');

/**
 * protect — verifies JWT and attaches req.user.
 * Use on any route that requires authentication.
 */
const protect = async (req, res, next) => {
  try {
    const token = extractBearer(req.headers.authorization);

    if (!token) {
      return sendError(res, 'No token provided. Please log in.', 401);
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendError(res, 'Your session has expired. Please log in again.', 401);
      }
      return sendError(res, 'Invalid token. Please log in.', 401);
    }

    // Fetch user (ensure they still exist and are active)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return sendError(res, 'User no longer exists.', 401);
    }
    if (!user.isActive) {
      return sendError(res, 'Your account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * requireRole — role-based access control guard.
 * Must be used AFTER protect.
 * Usage: router.post('/admin/...', protect, requireRole('admin'), handler)
 *
 * @param {...string} roles - allowed roles
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Not authenticated.', 401);
  }
  if (!roles.includes(req.user.role)) {
    return sendError(
      res,
      `Access denied. Requires one of: ${roles.join(', ')}.`,
      403
    );
  }
  next();
};

module.exports = { protect, requireRole };
