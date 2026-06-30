const express = require('express');
const ThresholdProfile = require('../models/ThresholdProfile');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { recordAudit } = require('../services/audit');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/', verifyToken, asyncHandler(async (req, res) => {
  const profiles = await ThresholdProfile.find();
  res.json(profiles);
}));

router.post('/', verifyToken, requireRole(['ADMIN']), validate('threshold'), asyncHandler(async (req, res) => {
  const { name, pm10, pm25, tvoc, temperature, humidity } = req.body;
  const profile = await ThresholdProfile.findOneAndUpdate(
    { name },
    { name, pm10, pm25, tvoc, temperature, humidity },
    { upsert: true, new: true }
  );
  await recordAudit(req.userId, 'UPDATE_THRESHOLD', { profileName: name });
  res.json(profile);
}));

router.delete('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
  await ThresholdProfile.findByIdAndDelete(req.params.id);
  res.json({ message: 'Threshold profile deleted successfully' });
}));

module.exports = router;
