const Room = require('../models/Room');
const Activity = require('../models/Activity');
const { sendSuccess, sendError, catchAsync } = require('../utils/response');

// ── Get all rooms the current user belongs to ─────────────────────────────────
const getMyRooms = catchAsync(async (req, res) => {
  const rooms = await Room.find({
    'members.user': req.user._id,
    isActive: true,
  })
    .populate('members.user', 'username displayName')
    .populate('createdBy', 'username displayName')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Attach the requesting user's own completion status to each room summary
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

// ── Get a single room (must be a member) ─────────────────────────────────────
const getRoomById = catchAsync(async (req, res) => {
  const room = await Room.findOne({
    _id: req.params.id,
    isActive: true,
  })
    .populate('members.user', 'username displayName role')
    .populate('createdBy', 'username displayName')
    .lean({ virtuals: true });

  if (!room) return sendError(res, 'Room not found.', 404);

  // Regular users can only view rooms they belong to
  if (req.user.role !== 'admin') {
    const isMember = room.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember) return sendError(res, 'You are not a member of this room.', 403);
  }

  return sendSuccess(res, { room });
});

// ── Get room by code (useful for join/lookup flows) ───────────────────────────
const getRoomByCode = catchAsync(async (req, res) => {
  const room = await Room.findOne({
    code: req.params.code.toUpperCase(),
    isActive: true,
  })
    .populate('members.user', 'username displayName')
    .populate('createdBy', 'username displayName')
    .lean({ virtuals: true });

  if (!room) return sendError(res, 'No room found with that code.', 404);

  if (req.user.role !== 'admin') {
    const isMember = room.members.some(
      (m) => m.user._id.toString() === req.user._id.toString()
    );
    if (!isMember) return sendError(res, 'You are not a member of this room.', 403);
  }

  return sendSuccess(res, { room });
});

// ── Get room members list ─────────────────────────────────────────────────────
const getRoomMembers = catchAsync(async (req, res) => {
  const room = await Room.findOne({
    _id: req.params.id,
    isActive: true,
  }).populate('members.user', 'username displayName role');

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

module.exports = {
  getMyRooms,
  getRoomById,
  getRoomByCode,
  getRoomMembers,
  getRoomActivity,
};
