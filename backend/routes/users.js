const express = require('express');
const User = require('../models/User');
const { verifyToken, requireRole } = require('../middleware/auth');
const { recordAudit } = require('../services/audit');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const users = await User.find().select('-password_hash');
  res.json(users);
}));

router.put('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const { username, role, email, is_active } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username) user.username = username;
  if (role) user.role = role;
  if (email) user.email = email;
  if (is_active !== undefined) user.is_active = is_active;
  if (req.body.password) user.password_hash = req.body.password;

  await user.save();
  await recordAudit(req.userId, 'UPDATE_USER', { targetUserId: user._id, targetUsername: user.username });
  res.json({ message: 'User updated successfully', user });
}));

router.delete('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (user) {
    await recordAudit(req.userId, 'DELETE_USER', { targetUserId: user._id, targetUsername: user.username });
  }
  res.json({ message: 'User deleted successfully' });
}));

module.exports = router;
