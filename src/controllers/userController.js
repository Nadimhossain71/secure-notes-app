const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Note = require('../models/Note');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { sanitizeUser } = require('./authController');

const SALT_ROUNDS = 12;

// GET /api/users  (admin only) - list all users, paginated
// Uses the { createdAt: -1 } index for the sort.
async function listUsers(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      users: users.map(sanitizeUser),
      pagination: buildPaginationMeta({ page, limit, total }),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id (admin only) - fetch a single user profile
// Uses the default _id index.
async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/users (admin only) - add a new user (optionally as admin)
async function createUser(req, res, next) {
  try {
    const { name, email, password, role, interests } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: passwordHash,
      role: role === 'admin' ? 'admin' : 'user',
      interests: Array.isArray(interests) ? interests : [],
    });

    res.status(201).json({ user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id (admin only) - update a user (profile fields and/or role)
async function updateUser(req, res, next) {
  try {
    const { name, email, role, interests, password } = req.body;
    const update = {};

    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email.toLowerCase();
    if (role !== undefined) {
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'role must be "user" or "admin"' });
      }
      update.role = role;
    }
    if (interests !== undefined) update.interests = interests;
    if (password !== undefined) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'password must be at least 8 characters' });
      }
      update.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    next(err);
  }
}

// DELETE /api/users/:id (admin only) - remove a user and cascade-delete their notes
async function deleteUser(req, res, next) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Cascade delete: keeps the Notes collection consistent (uses owner index).
    await Note.deleteMany({ owner: user._id });

    res.json({ message: 'User and their notes deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
