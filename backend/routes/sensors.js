const express = require('express');
const Room = require('../models/Room');
const SensorReading = require('../models/SensorReading');
const SensorNode = require('../models/SensorNode');
const { verifyToken } = require('../middleware/auth');
const { calculateAQI, predictTrend } = require('../services/aqi');
const { processReadingForAlerts } = require('../services/notifier');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = function createSensorsRouter(io) {
  const router = express.Router();

  router.get('/current', verifyToken, asyncHandler(async (req, res) => {
    const rooms = await Room.find();
    const currentData = await Promise.all(
      rooms.map(async (room) => {
        const latest = await SensorReading.findOne({ room: room._id }).sort({ timestamp: -1 });
        return { room, latest };
      })
    );
    res.json(currentData);
  }));

  router.get('/history/:roomIdStr', verifyToken, asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(history);
  }));

  router.get('/trends/:roomIdStr', verifyToken, asyncHandler(async (req, res) => {
    const room = await Room.findOne({ roomId: req.params.roomIdStr });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const history = await SensorReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(20);

    const prediction = predictTrend(history);
    res.json({ roomId: req.params.roomIdStr, ...prediction });
  }));

  router.post('/purpleair', asyncHandler(async (req, res) => {
    const payload = req.body;
    const sensorMac = payload.SensorId || payload.mac_address || payload.mac;

    if (!sensorMac) {
      return res.status(400).json({ error: 'Missing sensor identification (MAC/SensorId)' });
    }

    const node = await SensorNode.findOne({ $or: [{ mac_address: sensorMac }, { node_id: sensorMac }] });
    if (!node || !node.room) {
      return res.status(404).json({ error: 'Sensor node not registered or not assigned to a room' });
    }

    const room = await Room.findById(node.room).populate('thresholdProfile');

    const pm25_a = payload.pm2_5_atm || payload.pm25_a || 0;
    const pm25_b = payload.pm2_5_atm_b || payload.pm25_b || pm25_a;
    const pm10_a = payload.pm10_0_atm || payload.pm10_a || 0;
    const pm10_b = payload.pm10_0_atm_b || payload.pm10_b || pm10_a;
    const pm25 = (pm25_a + pm25_b) / 2;
    const pm10 = (pm10_a + pm10_b) / 2;
    const { aqi, status: aqi_status } = calculateAQI(pm25);

    const newReading = new SensorReading({
      room: room._id,
      node_id: node.node_id,
      pm1: payload.pm1_0_atm || 0,
      pm25_a,
      pm25_b,
      pm10_a,
      pm10_b,
      pm25,
      pm10,
      temperature: payload.current_temp_f ? ((payload.current_temp_f - 32) * 5 / 9) : (payload.temperature || 0),
      humidity: payload.current_humidity || payload.humidity || 0,
      aqi,
      aqi_status
    });

    await newReading.save();
    await processReadingForAlerts(newReading, room, io);

    const readingPayload = { roomId: room.roomId, ...newReading.toObject() };
    io.to('airquality/live').emit('sensor-update', readingPayload);
    io.to(`room-${room.roomId}`).emit('sensor-update', readingPayload);

    res.status(200).json({ success: true, readingId: newReading._id });
  }));

  return router;
};
