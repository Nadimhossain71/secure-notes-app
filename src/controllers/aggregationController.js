const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * GET /api/aggregations/users-by-interest
 *
 * Scenario 1: Group by Interests.
 * Requirement: exactly ONE collection.aggregate() call, no other query methods.
 *
 * Pipeline:
 *  1. $unwind interests      -> one doc per (user, interest) pair
 *  2. $group by interest     -> collects users + a count per interest
 *  3. $project                -> shape the output, hide password etc.
 *  4. $sort                   -> most popular interests first
 *
 * The multikey index on { interests: 1 } lets Mongo use an index to drive the
 * initial scan/unwind instead of a full collection scan when interests is
 * selective; $group/$sort still run in the pipeline as usual.
 */
async function usersByInterest(req, res, next) {
  try {
    const results = await User.aggregate([
      { $unwind: '$interests' },
      {
        $group: {
          _id: '$interests',
          count: { $sum: 1 },
          users: {
            $push: {
              id: '$_id',
              name: '$name',
              email: '$email',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          interest: '$_id',
          count: 1,
          users: 1,
        },
      },
      { $sort: { count: -1, interest: 1 } },
    ]);

    res.json({ groups: results });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/aggregations/users/:id/posts
 *
 * Scenario 2: User Posts ($lookup).
 * Requirement: a single aggregation pipeline using a $lookup stage to fetch
 * all posts belonging to a particular user.
 *
 * Pipeline:
 *  1. $match  -> narrow to the one requested user (uses default _id index)
 *  2. $lookup -> join the "posts" collection where posts.author == users._id
 *                (the { author: 1, createdAt: -1 } index on Post supports this join)
 *  3. $project -> return only the safe/relevant fields
 */
async function userPosts(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    const results = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'posts', // MongoDB collection name for the Post model
          localField: '_id',
          foreignField: 'author',
          as: 'posts',
        },
      },
      {
        $project: {
          _id: 0,
          id: '$_id',
          name: 1,
          email: 1,
          posts: {
            _id: 1,
            title: 1,
            content: 1,
            createdAt: 1,
          },
        },
      },
    ]);

    if (!results.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ result: results[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { usersByInterest, userPosts };
