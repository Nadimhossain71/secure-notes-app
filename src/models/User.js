const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      // NOTE: uniqueness + the index itself are both declared once, below,
      // via schema.index() (not here), to avoid Mongoose creating a
      // duplicate implicit index alongside the explicit one.
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // never return password hash by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // e.g. ['chess', 'reading'] - used by the "group users by interests" aggregation
    interests: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

/**
 * INDEX STRATEGY (only what is actually required, per task constraint):
 *
 * 1) { email: 1 } unique
 *    - Enforces uniqueness AND supports the login lookup (User.findOne({ email }))
 *      and the "GET user profile by email" style read paths.
 *
 * 2) { interests: 1 } (multikey index, since interests is an array)
 *    - Supports Aggregation Scenario 1 ($unwind + $group on interests).
 *
 * 3) { createdAt: -1 }
 *    - Supports the admin "list all users" paginated view, sorted by newest first.
 *
 * Note: fetching a single user by id (GET /users/:id) is already covered by the
 * default _id index that MongoDB creates automatically, so no extra index is added
 * for that.
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
