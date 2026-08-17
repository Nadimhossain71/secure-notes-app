const Note = require('../models/Note');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

// POST /api/notes - create a note owned by the current user
async function createNote(req, res, next) {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const note = await Note.create({ title, content, owner: req.user._id });
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes - list notes, paginated
// - Regular users: only their own notes -> uses { owner:1, createdAt:-1 } index.
// - Admins: everyone's notes -> uses { createdAt:-1 } index.
async function listNotes(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('owner', 'name email'),
      Note.countDocuments(filter),
    ]);

    res.json({ notes, pagination: buildPaginationMeta({ page, limit, total }) });
  } catch (err) {
    next(err);
  }
}

// GET /api/notes/:id - fetch a single note (owner or admin)
// Uses the default _id index.
async function getNote(req, res, next) {
  try {
    const note = await Note.findById(req.params.id).populate('owner', 'name email');
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const isOwner = note.owner._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to view this note' });
    }

    res.json({ note });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notes/:id - update a note (owner or admin)
async function updateNote(req, res, next) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const isOwner = note.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to modify this note' });
    }

    const { title, content } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;

    await note.save();
    res.json({ note });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/notes/:id - delete a note (owner or admin)
async function deleteNote(req, res, next) {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const isOwner = note.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to delete this note' });
    }

    await note.deleteOne();
    res.json({ message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createNote, listNotes, getNote, updateNote, deleteNote };
