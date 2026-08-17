const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
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
    author: {
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
 * 1) { author: 1, createdAt: -1 }
 *    - Supports Aggregation Scenario 2: the $lookup stage joins Users -> Posts
 *      on { localField: '_id', foreignField: 'author' }. Mongo uses an index on
 *      the foreignField (author) of the "from" collection to make that lookup
 *      efficient. The createdAt suffix also lets a direct
 *      Post.find({ author }).sort({ createdAt: -1 }) list be served by the index.
 */
postSchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
