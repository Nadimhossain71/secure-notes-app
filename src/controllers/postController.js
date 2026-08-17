const Post = require('../models/Post');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// POST /api/posts - any authenticated user can write a post; posts are public
async function createPost(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const post = await Post.create({ title, content, author: req.user._id });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

// GET /api/posts - public feed of all posts, paginated (uses author+createdAt index for sort)
async function listPosts(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [posts, total] = await Promise.all([
      Post.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('author', 'name email'),
      Post.countDocuments(),
    ]);

    res.json({ posts, pagination: buildPaginationMeta({ page, limit, total }) });
  } catch (err) {
    next(err);
  }
}

module.exports = { createPost, listPosts };
