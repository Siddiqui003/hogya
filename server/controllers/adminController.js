const Room = require('../models/Room');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { generateRoomCode } = require('../utils/roomCode');
const { sendSuccess, sendError, catchAsync, parseMongooseErrors } = require('../utils/response');

// ── Create room ───────────────────────────────────────────────────────────────
const createRoom = catchAsync(async (req, res) => {
  const { name, taskName, description, code } = req.body;

  if (!name || !taskName) {
    return sendError(res, 'Room name and task name are required.', 400);
  }

  const roomCode = code
    ? code.trim().toUpperCase()
    : await generateRoomCode();

  // Check code collision if manually provided
  if (code) {
    const exists = await Room.findOne({ code: roomCode });
    if (exists) {
      return sendError(res, `Room code "${roomCode}" is already in use.`, 409);
    }
  }

  let room;
  try {
    room = await Room.create({
      name: name.trim(),
      taskName: taskName.trim(),
      description: description?.trim(),
      code: roomCode,
      createdBy: req.user._id,
      members: [],
    });
  } catch (err) {
    const validationErrors = parseMongooseErrors(err);
    if (validationErrors) {
      return sendError(res, 'Validation failed.', 422, validationErrors);
    }
    throw err;
  }

  // Log activity
  await Activity.create({
    room: room._id,
    user: req.user._id,
    type: 'room_created',
    meta: { roomName: room.name },
  });

  await room.populate('createdBy', 'username displayName');

  return sendSuccess(res, { room }, 201, 'Room created successfully.');
});

// ── List all rooms (admin view) ───────────────────────────────────────────────
const listAllRooms = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { isActive: true };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search.toUpperCase() } },
    ];
  }

  const [rooms, total] = await Promise.all([
    Room.find(filter)
      .populate('createdBy', 'username displayName')
      .populate('members.user', 'username displayName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true }),
    Room.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    rooms,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// ── Get single room (admin) ───────────────────────────────────────────────────
const getRoom = catchAsync(async (req, res) => {
  const room = await Room.findById(req.params.id)
    .populate('createdBy', 'username displayName')
    .populate('members.user', 'username displayName role')
    .lean({ virtuals: true });

  if (!room) return sendError(res, 'Room not found.', 404);

  return sendSuccess(res, { room });
});

// ── Update room ───────────────────────────────────────────────────────────────
const updateRoom = catchAsync(async (req, res) => {
  const { name, taskName, description, isActive } = req.body;

  const allowed = {};
  if (name !== undefined)        allowed.name = name.trim();
  if (taskName !== undefined)    allowed.taskName = taskName.trim();
  if (description !== undefined) allowed.description = description.trim();
  if (isActive !== undefined)    allowed.isActive = isActive;

  if (!Object.keys(allowed).length) {
    return sendError(res, 'No updatable fields provided.', 400);
  }

  const room = await Room.findByIdAndUpdate(req.params.id, allowed, {
    new: true,
    runValidators: true,
  })
    .populate('createdBy', 'username displayName')
    .populate('members.user', 'username displayName');

  if (!room) return sendError(res, 'Room not found.', 404);

  return sendSuccess(res, { room }, 200, 'Room updated.');
});

// ── Delete room ───────────────────────────────────────────────────────────────
const deleteRoom = catchAsync(async (req, res) => {
  const room = await Room.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!room) return sendError(res, 'Room not found.', 404);

  return sendSuccess(res, {}, 200, 'Room deactivated.');
});

// ── Add member to room ────────────────────────────────────────────────────────
const addMember = catchAsync(async (req, res) => {
  const { userId } = req.body;
  if (!userId) return sendError(res, 'userId is required.', 400);

  const [room, user] = await Promise.all([
    Room.findById(req.params.id),
    User.findById(userId),
  ]);

  if (!room) return sendError(res, 'Room not found.', 404);
  if (!user) return sendError(res, 'User not found.', 404);
  if (!room.isActive) return sendError(res, 'Room is not active.', 400);

  if (room.hasMember(userId)) {
    return sendError(res, `${user.username} is already a member of this room.`, 409);
  }

  room.members.push({ user: userId, isCompleted: false, completedAt: null });
  await room.save();

  // Log activity
  await Activity.create({
    room: room._id,
    user: userId,
    type: 'member_joined',
    meta: { addedBy: req.user.username },
  });

  // Emit real-time update
  req.io.to(room._id.toString()).emit('member:joined', {
    roomId: room._id,
    user: user.toPublic(),
  });

  await room.populate('members.user', 'username displayName');

  return sendSuccess(res, { room }, 200, `${user.username} added to room.`);
});

// ── Remove member from room ───────────────────────────────────────────────────
const removeMember = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const room = await Room.findById(req.params.id);
  if (!room) return sendError(res, 'Room not found.', 404);

  if (!room.hasMember(userId)) {
    return sendError(res, 'User is not a member of this room.', 404);
  }

  room.members = room.members.filter((m) => m.user.toString() !== userId);
  await room.save();

  // Log activity
  await Activity.create({
    room: room._id,
    user: userId,
    type: 'member_left',
    meta: { removedBy: req.user.username },
  });

  req.io.to(room._id.toString()).emit('member:left', {
    roomId: room._id,
    userId,
  });

  return sendSuccess(res, {}, 200, 'Member removed from room.');
});

// ── List all users (admin helper for assignment UI) ───────────────────────────
const listAllUsers = catchAsync(async (req, res) => {
  const { search } = req.query;

  const filter = { isActive: true };
  if (search) {
    filter.$or = [
      { username: { $regex: search, $options: 'i' } },
      { displayName: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('username displayName role createdAt')
    .sort({ username: 1 })
    .limit(50);

  return sendSuccess(res, { users });
});

// ── Get room activity feed (admin) ────────────────────────────────────────────
const getRoomActivity = catchAsync(async (req, res) => {
  const { limit = 50 } = req.query;

  const room = await Room.findById(req.params.id);
  if (!room) return sendError(res, 'Room not found.', 404);

  const activities = await Activity.find({ room: req.params.id })
    .populate('user', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  return sendSuccess(res, { activities });
});

module.exports = {
  createRoom,
  listAllRooms,
  getRoom,
  updateRoom,
  deleteRoom,
  addMember,
  removeMember,
  listAllUsers,
  getRoomActivity,
};
