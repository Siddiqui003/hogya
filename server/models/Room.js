const mongoose = require('mongoose');

// ── Member sub-document ───────────────────────────────────────────────────────
// Completion status is embedded here (see README for design decision rationale).
// For MVP rooms (<100 members) this gives us a single-document read for the
// entire room view, and atomic updates via $set on the nested array element.
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // no separate _id per member entry; user ObjectId is the key
);

// ── Room schema ───────────────────────────────────────────────────────────────
const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: [2, 'Room name must be at least 2 characters'],
      maxlength: [80, 'Room name must be at most 80 characters'],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{4,10}$/, 'Room code must be 4–10 uppercase alphanumeric characters'],
    },
    taskName: {
      type: String,
      required: [true, 'Task name is required'],
      trim: true,
      minlength: [2, 'Task name must be at least 2 characters'],
      maxlength: [200, 'Task name must be at most 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be at most 500 characters'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────
roomSchema.virtual('totalMembers').get(function () {
  return this.members.length;
});

roomSchema.virtual('completedCount').get(function () {
  return this.members.filter((m) => m.isCompleted).length;
});

roomSchema.virtual('completionPercentage').get(function () {
  if (!this.members.length) return 0;
  return Math.round((this.completedCount / this.members.length) * 100);
});

// ── Instance helpers ──────────────────────────────────────────────────────────
// Check if a user is a member
roomSchema.methods.hasMember = function (userId) {
  return this.members.some((m) => {
    const memberId = m.user._id ? m.user._id : m.user;
    return memberId.toString() === userId.toString()
    // m.user.toString() === userId.toString());
  });
};

// Get a member entry by userId
roomSchema.methods.getMember = function (userId) {
  return this.members.find((m) => {
     const memberId = m.user._id ? m.user._id : m.user;
    return memberId.toString() === userId.toString()
    // m.user.toString() === userId.toString());
  });
};

// ── Indexes ───────────────────────────────────────────────────────────────────
// roomSchema.index({ code: 1 });
roomSchema.index({ 'members.user': 1 });
roomSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Room', roomSchema);
