const mongoose = require('mongoose');

// Activity is stored in its own collection so the room document doesn't
// grow unboundedly with history. It's append-only and cheap to query by room.
const activitySchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'task_completed',   // user marked task done
        'task_reopened',    // user un-marked task (if we support it)
        'member_joined',    // user added to room
        'member_left',      // user removed from room
        'room_created',     // room was created
      ],
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed, // extra context per event type
      default: {},
    },
  },
  {
    timestamps: true, // createdAt = event timestamp
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
activitySchema.index({ room: 1, createdAt: -1 }); // room feed (newest first)
activitySchema.index({ user: 1, createdAt: -1 }); // user history

module.exports = mongoose.model('Activity', activitySchema);
