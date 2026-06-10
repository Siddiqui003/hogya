const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username must be at most 30 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never returned in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name must be at most 50 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: rooms this user belongs to (resolved via Room model)
userSchema.virtual('rooms', {
  ref: 'Room',
  localField: '_id',
  foreignField: 'members.user',
});

// Pre-save hook: hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: safe public object (no password)
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    role: this.role,
    isActive: this.isActive,
    createdAt: this.createdAt,
  };
};

// Index for fast username lookup
userSchema.index({ username: 1 });

module.exports = mongoose.model('User', userSchema);
