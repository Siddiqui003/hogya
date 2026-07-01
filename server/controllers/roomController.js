const Room = require('../models/Room');
const Activity = require('../models/Activity');
const { sendSuccess, sendError, catchAsync } = require('../utils/response');

// ── Get all rooms the current user belongs to ─────────────────────────────────
const getMyRooms = catchAsync(async (req, res) => {
  const rooms = await Room.find({ 'members.user': req.user._id, isActive: true })
    .populate('members.user', 'username displayName')
    .populate('createdBy', 'username displayName')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  const roomsWithStatus = rooms.map((room) => {
    const myMember = room.members.find(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    return {
      ...room,
      myStatus: myMember
        ? { isCompleted: myMember.isCompleted, completedAt: myMember.completedAt }
        : null,
    };
  });

  return sendSuccess(res, { rooms: roomsWithStatus });
});

// ── Get single room (must be a member or admin) ───────────────────────────────
const getRoomById = catchAsync(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true })
    .populate('members.user', 'username displayName role')
    .populate('createdBy', 'username displayName')
    .lean({ virtuals: true });

  if (!room) return sendError(res, 'Room not found.', 404);

  if (req.user.role !== 'admin') {
    const isMember = room.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember) return sendError(res, 'You are not a member of this room.', 403);
  }

  return sendSuccess(res, { room });
});

// ── Get room by code (for preview before joining) ────────────────────────────
const getRoomByCode = catchAsync(async (req, res) => {
  const room = await Room.findOne({
    code: req.params.code.toUpperCase(),
    isActive: true,
  })
    .populate('members.user', 'username displayName')
    .populate('createdBy', 'username displayName')
    .lean({ virtuals: true });

  if (!room) return sendError(res, 'No room found with that code.', 404);

  // Return limited info if user is not a member — enough for the join preview
  const isMember = room.members.some(
    (m) => m.user._id.toString() === req.user._id.toString()
  );
  const isAdmin = req.user.role === 'admin';

  if (!isMember && !isAdmin) {
    // Non-member preview — just enough to show the join confirmation screen
    return sendSuccess(res, {
      room: {
        _id: room._id,
        name: room.name,
        code: room.code,
        taskName: room.taskName,
        description: room.description,
        joinable: room.joinable,
        totalMembers: room.members.length,
        isMember: false,
      },
    });
  }

  return sendSuccess(res, { room: { ...room, isMember } });
});

// ── Self-join a room via code ─────────────────────────────────────────────────
const joinRoom = catchAsync(async (req, res) => {
  const { code } = req.body;
  if (!code) return sendError(res, 'Room code is required.', 400);

  const room = await Room.findOne({ code: code.toUpperCase().trim(), isActive: true });
  if (!room) return sendError(res, 'No room found with that code.', 404);

  if (!room.joinable) {
    return sendError(res, 'This room is closed. Ask an admin to add you.', 403);
  }

  if (room.hasMember(req.user._id)) {
    return sendError(res, 'You are already a member of this room.', 409);
  }

  room.members.push({ user: req.user._id, isCompleted: false, completedAt: null });
  await room.save();

  await Activity.create({
    room: room._id,
    user: req.user._id,
    type: 'member_joined',
    meta: { joinedViaCode: true },
  });

  req.io.to(room._id.toString()).emit('member:joined', {
    roomId: room._id,
    user: req.user.toPublic(),
  });

  await room.populate('members.user', 'username displayName');
  return sendSuccess(res, { room }, 200, `You have joined "${room.name}".`);
});

// ── Leave a room (user self-removes) ─────────────────────────────────────────
const leaveRoom = catchAsync(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true });
  if (!room) return sendError(res, 'Room not found.', 404);

  if (!room.hasMember(req.user._id)) {
    return sendError(res, 'You are not a member of this room.', 404);
  }

  room.members = room.members.filter(
    (m) => m.user.toString() !== req.user._id.toString()
  );
  await room.save();

  await Activity.create({
    room: room._id,
    user: req.user._id,
    type: 'member_left',
    meta: { selfLeft: true },
  });

  req.io.to(room._id.toString()).emit('member:left', {
    roomId: room._id,
    userId: req.user._id,
  });

  return sendSuccess(res, {}, 200, `You have left "${room.name}".`);
});

// ── Get room members ──────────────────────────────────────────────────────────
const getRoomMembers = catchAsync(async (req, res) => {
  const room = await Room.findOne({ _id: req.params.id, isActive: true })
    .populate('members.user', 'username displayName role');

  if (!room) return sendError(res, 'Room not found.', 404);
  if (req.user.role !== 'admin' && !room.hasMember(req.user._id)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  return sendSuccess(res, { members: room.members });
});

// ── Get room activity feed (member view) ──────────────────────────────────────
const getRoomActivity = catchAsync(async (req, res) => {
  const { limit = 30 } = req.query;
  const room = await Room.findOne({ _id: req.params.id, isActive: true });
  if (!room) return sendError(res, 'Room not found.', 404);

  if (req.user.role !== 'admin' && !room.hasMember(req.user._id)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  const activities = await Activity.find({ room: req.params.id })
    .populate('user', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  return sendSuccess(res, { activities });
});

module.exports = { getMyRooms, getRoomById, getRoomByCode, joinRoom, leaveRoom, getRoomMembers, getRoomActivity };
