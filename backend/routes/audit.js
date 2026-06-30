const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  const logs = await AuditLog.find()
    .populate('user', 'username role')
    .sort({ timestamp: -1 })
    .limit(200);
  res.json(logs);
}));

module.exports = router;
