const express = require('express');
const Room = require('../models/Room');
const MaintenanceLog = require('../models/MaintenanceLog');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { recordAudit } = require('../services/audit');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    MaintenanceLog.find()
      .populate('room')
      .populate('technician', 'username')
      .sort({ performedAt: -1 })
      .skip(skip)
      .limit(limit),
    MaintenanceLog.countDocuments()
  ]);
  res.json({ total, page, limit, logs });
}));

router.post('/', verifyToken, requireRole(['TECHNICIAN', 'ADMIN']), validate('maintenance'), asyncHandler(async (req, res) => {
  const { roomId, actionType, details } = req.body;
  const room = await Room.findOne({ roomId });
  if (!room) {
  throw new AppError('Room not found', 404);
}

  const log = new MaintenanceLog({
    room: room._id,
    technician: req.userId,
    actionType,
    details
  });
  await log.save();
  await recordAudit(req.userId, 'LOG_MAINTENANCE', { roomId, actionType });
  res.status(201).json(log);
}));

router.put('/:id', verifyToken, requireRole(['TECHNICIAN', 'ADMIN']), validate('maintenance'), asyncHandler(async (req, res) => {
  const { roomId, actionType, details } = req.body;
  const log = await MaintenanceLog.findById(req.params.id);
  if (!log) {
  throw new AppError('Maintenance log not found', 404);
}

  if (roomId) {
    const room = await Room.findOne({ roomId });
    if (room) log.room = room._id;
  }
  if (actionType) log.actionType = actionType;
  if (details) log.details = details;

  await log.save();
  await recordAudit(req.userId, 'UPDATE_MAINTENANCE', { logId: log._id });
  res.json(log);
}));

router.delete('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  await MaintenanceLog.findByIdAndDelete(req.params.id);
  res.json({ message: 'Maintenance log deleted successfully' });
}));

module.exports = router;
