const express = require('express');
const SensorNode = require('../models/SensorNode');
const SensorReading = require('../models/SensorReading');
const NodeHealth = require('../models/NodeHealth');
const { verifyToken, requireRole } = require('../middleware/auth');
const { cacheGet, cacheSetex } = require('../redisClient');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = function createHealthRouter(io) {
  const router = express.Router();

  router.get('/', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), asyncHandler(async (req, res) => {
    const cacheKey = 'api_health';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const nodeCount = await SensorNode.countDocuments();
    const readingCount = await SensorReading.countDocuments();
    const nodes = await SensorNode.find().populate('room');

    const mappedNodes = nodes.map(n => ({
      id: n.node_id,
      room: n.room ? n.room.name : 'Unassigned',
      status: n.status ? n.status.toLowerCase() : 'offline',
      rssi: n.rssi !== undefined ? n.rssi : null,
      battery_level: n.battery_level !== undefined ? n.battery_level : null,
      battery_voltage: n.battery_voltage !== undefined ? n.battery_voltage : null,
      fw: n.firmware || '1.0.0',
      lastSeen: n.last_heartbeat ? new Date(n.last_heartbeat).toLocaleTimeString() : 'Unknown'
    }));

    const healthEntryCount = await NodeHealth.countDocuments();
    const healthData = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage()
      },
      mqtt: {
        label: 'Aedes Broker',
        detail: 'Internal MQTT Server',
        status: 'online',
        uptime: Math.floor(process.uptime()) + 's',
        clients: nodeCount,
        msgs: readingCount
      },
      websocket: {
        label: 'Socket.io',
        detail: 'Real-time Updates',
        status: 'online',
        uptime: Math.floor(process.uptime()) + 's',
        connections: io.engine.clientsCount,
        messages: readingCount * 2
      },
      database: {
        readingCount,
        nodeCount,
        healthEntryCount
      },
      nodes: mappedNodes
    };

    await cacheSetex(cacheKey, 30, JSON.stringify(healthData));
    res.json(healthData);
  }));

  return router;
};
