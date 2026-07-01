const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    joinedAt:    { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: [true, 'Room name is required'],
      trim: true, minlength: [2, 'Min 2 chars'], maxlength: [80, 'Max 80 chars'],
    },
    code: {
      type: String, required: true, unique: true, uppercase: true, trim: true,
      match: [/^[A-Z0-9]{4,10}$/, 'Code must be 4-10 uppercase alphanumeric chars'],
    },
    taskName: {
      type: String, required: [true, 'Task name is required'],
      trim: true, minlength: [2, 'Min 2 chars'], maxlength: [200, 'Max 200 chars'],
    },
    description: { type: String, trim: true, maxlength: [500, 'Max 500 chars'] },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members:     { type: [memberSchema], default: [] },
    // joinable: when true, any authenticated user can self-join via room code.
    // When false, only admins can add members manually.
    joinable:    { type: Boolean, default: true },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

roomSchema.virtual('totalMembers').get(function () { return this.members.length; });
roomSchema.virtual('completedCount').get(function () { return this.members.filter((m) => m.isCompleted).length; });
roomSchema.virtual('completionPercentage').get(function () {
  if (!this.members.length) return 0;
  return Math.round((this.completedCount / this.members.length) * 100);
});

roomSchema.methods.hasMember = function (userId) {
  return this.members.some((m) => {
    const memberId = m.user?._id || m.user;
    return memberId.toString() === userId.toString();
  });
};

roomSchema.methods.getMember = function (userId) {
  return this.members.find((m) => {
    const memberId = m.user?._id || m.user;
    return memberId.toString() === userId.toString();
  });
};
// roomSchema.methods.hasMember = function (userId) {
//   return this.members.some((m) => m.user.toString() === userId.toString());
// };
// roomSchema.methods.getMember = function (userId) {
//   return this.members.find((m) => m.user.toString() === userId.toString());
// };

roomSchema.index({ code: 1 });
roomSchema.index({ 'members.user': 1 });
roomSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Room', roomSchema);
