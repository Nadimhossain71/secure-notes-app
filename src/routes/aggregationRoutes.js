const express = require('express');
const { usersByInterest, userPosts } = require('../controllers/aggregationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Scenario 1: Group by Interests
router.get('/users-by-interest', usersByInterest);

// Scenario 2: User Posts ($lookup)
router.get('/users/:id/posts', userPosts);

module.exports = router;
