const express = require('express');
const Room = require('../models/Room');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { recordAudit } = require('../services/audit');
const { resolveThresholdProfile } = require('../utils/roomThresholds');
const { cacheGet, cacheSetex, cacheDel } = require('../redisClient');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();
const ROOMS_CACHE_KEY = 'rooms_all';

router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const cached = await cacheGet(ROOMS_CACHE_KEY);
  if (cached) return res.json(JSON.parse(cached));
  const rooms = await Room.find().populate('thresholdProfile');
  await cacheSetex(ROOMS_CACHE_KEY, 60, JSON.stringify(rooms));
  res.json(rooms);
}));

router.post('/', verifyToken, requireRole(['ADMIN']), validate('room'), asyncHandler(async (req, res) => {
  const { roomId, name, type, thresholdProfile, customThresholds } = req.body;
  const profileId = await resolveThresholdProfile({ roomId, thresholdProfile, customThresholds });

  const room = await Room.findOneAndUpdate(
    { roomId },
    { roomId, name, type, thresholdProfile: profileId },
    { upsert: true, new: true }
  );

  await cacheDel(ROOMS_CACHE_KEY);
  await recordAudit(req.userId, 'CREATE_ROOM', { roomId, name, type });
  res.status(201).json(room);
}));

router.put('/:id', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('roomUpdate'), asyncHandler(async (req, res) => {
  const { roomId, name, type, thresholdProfile, customThresholds } = req.body;
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const profileId = customThresholds || thresholdProfile
    ? await resolveThresholdProfile({ roomId: roomId || room.roomId, thresholdProfile, customThresholds })
    : null;

  room.roomId = roomId || room.roomId;
  room.name = name || room.name;
  room.type = type || room.type;
  if (profileId) room.thresholdProfile = profileId;

  await room.save();
  await cacheDel(ROOMS_CACHE_KEY);
  await recordAudit(req.userId, 'UPDATE_ROOM', { roomId: room.roomId });
  res.json(room);
}));

router.delete('/:id', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), asyncHandler(async (req, res) => {
  const room = await Room.findByIdAndDelete(req.params.id);
  if (room) {
    await cacheDel(ROOMS_CACHE_KEY);
    await recordAudit(req.userId, 'DELETE_ROOM', { roomId: room.roomId });
  }
  res.json({ message: 'Room deleted successfully' });
}));

module.exports = router;
