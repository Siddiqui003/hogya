const Room = require('../models/Room');
const Activity = require('../models/Activity');
const { sendSuccess, sendError, catchAsync } = require('../utils/response');

// ── Helper: emit socket event if io is available ──────────────────────────────
const emitToRoom = (io, roomId, event, payload) => {
  if (io) io.to(roomId.toString()).emit(event, payload);
};

// ── Complete a task ───────────────────────────────────────────────────────────
// POST /api/tasks/:roomId/complete
const completeTask = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;


  const room = await Room.findOne({ _id: roomId, isActive: true }).populate(
    'members.user',
    'username displayName'
  );

  if (!room) return sendError(res, 'Room not found.', 404);
  if (!room.hasMember(userId)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  const member = room.getMember(userId);
  if (member.isCompleted) {
    return sendError(res, 'You have already completed this task.', 409);
  }

  // Atomic update directly on the matched array element
  const completedAt = new Date();
  await Room.updateOne(
    { _id: roomId, 'members.user': userId },
    {
      $set: {
        'members.$.isCompleted': true,
        'members.$.completedAt': completedAt,
      },
    }
  );

  // Create activity entry
  const activity = await Activity.create({
    room: roomId,
    user: userId,
    type: 'task_completed',
    meta: {
      taskName: room.taskName,
      completedAt,
    },
  });

  await activity.populate('user', 'username displayName');

  // Build the broadcast payload
  const eventPayload = {
    roomId,
    userId: userId.toString(),
    user: req.user.toPublic(),
    isCompleted: true,
    completedAt,
    activity: {
      _id: activity._id,
      type: activity.type,
      user: activity.user,
      meta: activity.meta,
      createdAt: activity.createdAt,
    },
  };

  // Broadcast to everyone in the socket room (Phase 5 makes this live)
  emitToRoom(req.io, roomId, 'task:completed', eventPayload);

  return sendSuccess(
    res,
    { userId: userId.toString(), isCompleted: true, completedAt, activity },
    200,
    'Task marked as complete.'
  );
});

// ── Reopen (undo) a task ──────────────────────────────────────────────────────
// POST /api/tasks/:roomId/reopen
const reopenTask = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;

  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) return sendError(res, 'Room not found.', 404);
  if (!room.hasMember(userId)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  const member = room.getMember(userId);
  if (!member.isCompleted) {
    return sendError(res, 'Your task is not currently marked as complete.', 409);
  }

  await Room.updateOne(
    { _id: roomId, 'members.user': userId },
    {
      $set: {
        'members.$.isCompleted': false,
        'members.$.completedAt': null,
      },
    }
  );

  const activity = await Activity.create({
    room: roomId,
    user: userId,
    type: 'task_reopened',
    meta: { taskName: room.taskName },
  });

  await activity.populate('user', 'username displayName');

  const eventPayload = {
    roomId,
    userId: userId.toString(),
    user: req.user.toPublic(),
    isCompleted: false,
    completedAt: null,
    activity: {
      _id: activity._id,
      type: activity.type,
      user: activity.user,
      meta: activity.meta,
      createdAt: activity.createdAt,
    },
  };

  emitToRoom(req.io, roomId, 'task:reopened', eventPayload);

  return sendSuccess(
    res,
    { userId: userId.toString(), isCompleted: false, completedAt: null, activity },
    200,
    'Task reopened.'
  );
});

// ── Get my status in a room ───────────────────────────────────────────────────
// GET /api/tasks/:roomId/status
const getMyStatus = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;

  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) return sendError(res, 'Room not found.', 404);
  if (!room.hasMember(userId)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  const member = room.getMember(userId);

  return sendSuccess(res, {
    roomId,
    userId: userId.toString(),
    isCompleted: member.isCompleted,
    completedAt: member.completedAt,
  });
});

// ── Get completion status of all members in a room ────────────────────────────
// GET /api/tasks/:roomId/all-statuses
const getAllStatuses = catchAsync(async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user._id;

  const room = await Room.findOne({ _id: roomId, isActive: true }).populate(
    'members.user',
    'username displayName'
  );

  if (!room) return sendError(res, 'Room not found.', 404);

  // Must be a member or admin
  if (req.user.role !== 'admin' && !room.hasMember(userId)) {
    return sendError(res, 'You are not a member of this room.', 403);
  }

  const statuses = room.members.map((m) => ({
    user: m.user,
    isCompleted: m.isCompleted,
    completedAt: m.completedAt,
    joinedAt: m.joinedAt,
  }));

  // Summary counts (virtuals don't survive .lean(), compute manually)
  const completedCount = statuses.filter((s) => s.isCompleted).length;
  const totalMembers = statuses.length;

  return sendSuccess(res, {
    roomId,
    taskName: room.taskName,
    statuses,
    summary: {
      totalMembers,
      completedCount,
      pendingCount: totalMembers - completedCount,
      completionPercentage:
        totalMembers > 0 ? Math.round((completedCount / totalMembers) * 100) : 0,
    },
  });
});

// ── Admin: reset all statuses in a room ──────────────────────────────────────
// POST /api/tasks/:roomId/reset  (admin only — enforced in route)
const resetAllStatuses = catchAsync(async (req, res) => {
  console.log("in resetallstatuses");
  const { roomId } = req.params;

  const room = await Room.findOne({ _id: roomId, isActive: true });
  if (!room) return sendError(res, 'Room not found.', 404);

  // Set every member's isCompleted=false, completedAt=null
  await Room.updateOne(
    { _id: roomId },
    {
      $set: room.members.reduce((acc, _m, i) => {
        acc[`members.${i}.isCompleted`] = false;
        acc[`members.${i}.completedAt`] = null;
        return acc;
      }, {}),
    }
  );
  const updatedRoom = await Room.findById(roomId).populate('members.user', 'username displayName role').lean();
  emitToRoom(req.io, roomId, 'task:reset', { roomId, members: updatedRoom.members });

  // emitToRoom(req.io, roomId, 'task:reset', { roomId });

  return sendSuccess(res, { roomId }, 200, 'All task statuses have been reset.');
});

module.exports = {
  completeTask,
  reopenTask,
  getMyStatus,
  getAllStatuses,
  resetAllStatuses,
};
