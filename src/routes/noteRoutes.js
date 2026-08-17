const express = require('express');
const {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.post('/', createNote);
router.get('/', listNotes); // users: own notes only; admins: everyone's notes
router.get('/:id', getNote);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
