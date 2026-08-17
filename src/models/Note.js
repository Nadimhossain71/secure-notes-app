const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * INDEX STRATEGY:
 *
 * 1) { owner: 1, createdAt: -1 }
 *    - Supports a user listing THEIR OWN notes, paginated and sorted by newest
 *      first: Note.find({ owner }).sort({ createdAt: -1 }).skip().limit().
 *
 * 2) { createdAt: -1 }
 *    - Supports the admin "view everyone's notes" list (no owner filter),
 *      paginated and sorted by newest first. A compound index starting with
 *      `owner` cannot serve this sort efficiently without an owner filter,
 *      hence the separate index.
 *
 * Fetching a single note by id (GET /notes/:id) is already covered by the
 * default _id index, so no extra index is added for that.
 */
noteSchema.index({ owner: 1, createdAt: -1 });
noteSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);
