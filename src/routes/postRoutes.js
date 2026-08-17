const express = require('express');
const { createPost, listPosts } = require('../controllers/postController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', listPosts); // public feed
router.post('/', requireAuth, createPost); // must be logged in to write

module.exports = router;
