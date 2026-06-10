const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { sendSuccess, sendError, catchAsync, parseMongooseErrors } = require('../utils/response');

// ── Register ──────────────────────────────────────────────────────────────────
const register = catchAsync(async (req, res) => {
  const { username, password, displayName } = req.body;

  // Basic presence validation
  if (!username || !password) {
    return sendError(res, 'Username and password are required.', 400);
  }

  // Check duplicate
  const existing = await User.findOne({ username: username.trim().toLowerCase() });
  if (existing) {
    return sendError(res, 'Username is already taken.', 409);
  }

  let user;
  try {
    user = await User.create({
      username: username.trim(),
      password,
      displayName: displayName?.trim() || username.trim(),
      role: 'user', // registration always creates a regular user
    });
  } catch (err) {
    const validationErrors = parseMongooseErrors(err);
    if (validationErrors) {
      return sendError(res, 'Validation failed.', 422, validationErrors);
    }
    throw err;
  }

  const token = signToken({ id: user._id, username: user.username, role: user.role });

  return sendSuccess(
    res,
    { token, user: user.toPublic() },
    201,
    'Account created successfully.'
  );
});

// ── Login ─────────────────────────────────────────────────────────────────────
const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, 'Username and password are required.', 400);
  }

  // Explicitly select password (it's select:false on schema)
  const user = await User.findOne({ username: username.trim() }).select('+password');

  if (!user) {
    // Intentionally vague — don't reveal whether user exists
    return sendError(res, 'Invalid username or password.', 401);
  }

  if (!user.isActive) {
    return sendError(res, 'Your account has been deactivated. Contact an administrator.', 403);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return sendError(res, 'Invalid username or password.', 401);
  }

  // Update lastLogin
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({ id: user._id, username: user.username, role: user.role });

  return sendSuccess(res, { token, user: user.toPublic() }, 200, 'Login successful.');
});

// ── Get current user ──────────────────────────────────────────────────────────
const getMe = catchAsync(async (req, res) => {
  // req.user is attached by the protect middleware
  return sendSuccess(res, { user: req.user.toPublic() }, 200);
});

// ── Update profile ────────────────────────────────────────────────────────────
const updateProfile = catchAsync(async (req, res) => {
  const { displayName } = req.body;

  const allowedUpdates = {};
  if (displayName !== undefined) {
    allowedUpdates.displayName = displayName.trim();
  }

  if (!Object.keys(allowedUpdates).length) {
    return sendError(res, 'No updatable fields provided.', 400);
  }

  const user = await User.findByIdAndUpdate(req.user._id, allowedUpdates, {
    new: true,
    runValidators: true,
  });

  return sendSuccess(res, { user: user.toPublic() }, 200, 'Profile updated.');
});

// ── Change password ───────────────────────────────────────────────────────────
const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 'Current password and new password are required.', 400);
  }
  if (newPassword.length < 6) {
    return sendError(res, 'New password must be at least 6 characters.', 400);
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return sendError(res, 'Current password is incorrect.', 401);
  }

  user.password = newPassword;
  await user.save();

  const token = signToken({ id: user._id, username: user.username, role: user.role });
  return sendSuccess(res, { token }, 200, 'Password changed successfully.');
});

module.exports = { register, login, getMe, updateProfile, changePassword };
