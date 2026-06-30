const express = require('express');
const Room = require('../models/Room');
const SensorNode = require('../models/SensorNode');
const NodeHealth = require('../models/NodeHealth');
const CommissioningSession = require('../models/CommissioningSession');
const Beacon = require('../models/Beacon');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { recordAudit } = require('../services/audit');
const { publishMqttCommand } = require('../mqtt/aedes_broker');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = function createNodesRouter(io) {
  const router = express.Router();

  router.get('/', verifyToken, asyncHandler(async (req, res) => {
    const nodes = await SensorNode.find().populate('room');
    res.json(nodes);
  }));

  router.post('/', verifyToken, requireRole(['ADMIN']), validate('nodeCreate'), asyncHandler(async (req, res) => {
    const {
      node_id, mac_address, firmware, hardware_version,
      room_id, status, location_method, location_confidence
    } = req.body;

    let room = null;
    if (room_id) {
      room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: 'General' });
        await room.save();
      }
    }

    const node = await SensorNode.findOneAndUpdate(
      { node_id },
      {
        node_id,
        mac_address,
        firmware,
        hardware_version,
        room: room?._id,
        configured_room: room?._id,
        status: status || 'ONLINE',
        location_method: location_method || 'TOPIC',
        location_confidence: location_confidence ?? 100,
        last_heartbeat: new Date()
      },
      { upsert: true, new: true }
    );

    await recordAudit(req.userId, 'REGISTER_NODE', { node_id, room_id });
    res.status(201).json(node);
  }));

  router.put('/:id', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('nodeUpdate'), asyncHandler(async (req, res) => {
    const {
      node_id, mac_address, firmware, hardware_version, room_id, status,
      location_method, location_confidence, battery_level, rssi, uptime,
      packet_loss_rate, last_reboot
    } = req.body;

    const node = await SensorNode.findById(req.params.id);
    if (!node) return res.status(404).json({ error: 'Sensor node not found' });

    if (node_id) node.node_id = node_id;
    if (mac_address) node.mac_address = mac_address;
    if (firmware) node.firmware = firmware;
    if (hardware_version) node.hardware_version = hardware_version;
    if (status) node.status = status;
    if (location_method) node.location_method = location_method;
    if (location_confidence !== undefined) node.location_confidence = location_confidence;
    if (battery_level !== undefined) node.battery_level = battery_level;
    if (rssi !== undefined) node.rssi = rssi;
    if (uptime !== undefined) node.uptime = uptime;
    if (packet_loss_rate !== undefined) node.packet_loss_rate = packet_loss_rate;
    if (last_reboot) node.last_reboot = last_reboot;

    if (room_id) {
      let room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: 'General' });
        await room.save();
      }
      node.room = room._id;
    }

    await node.save();
    await recordAudit(req.userId, 'UPDATE_NODE', { node_id: node.node_id });
    res.json(node);
  }));

  router.delete('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
    await SensorNode.findByIdAndDelete(req.params.id);
    res.json({ message: 'Node deleted successfully' });
  }));

  router.post('/:nodeId/calibrate', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('nodeCommand'), asyncHandler(async (req, res) => {
    const { nodeId } = req.params;
    const { command, parameters } = req.body;
    const node = await SensorNode.findOne({ node_id: nodeId }).populate('room');
    if (!node) return res.status(404).json({ error: 'Sensor node not found' });

    if (!node.room || !node.room.roomId) {
      return res.status(400).json({ error: 'Node must be assigned to a room before sending commands' });
    }

    const topic = `hospital/${node.room.roomId}/commands`;
    await publishMqttCommand(topic, { command, parameters: parameters || {} });
    await recordAudit(req.userId, 'SEND_NODE_COMMAND', { node_id: nodeId, command, parameters });
    io.emit('system/node-command', { nodeId, command, topic, timestamp: Date.now() });

    res.json({ message: `Command ${command} sent to node ${nodeId}`, status: 'SUCCESS', topic });
  }));

  router.get('/:nodeId/health', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), asyncHandler(async (req, res) => {
    const node = await SensorNode.findOne({ node_id: req.params.nodeId });
    if (!node) return res.status(404).json({ error: 'Sensor node not found' });
    const entries = await NodeHealth.find({ node_id: node.node_id }).sort({ timestamp: -1 }).limit(20);
    res.json(entries);
  }));

  router.post('/:nodeId/health', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('nodeHealth'), asyncHandler(async (req, res) => {
    const node = await SensorNode.findOne({ node_id: req.params.nodeId });
    if (!node) return res.status(404).json({ error: 'Sensor node not found' });

    const health = new NodeHealth({ node_id: node.node_id, ...req.body });
    await health.save();
    await recordAudit(req.userId, 'CREATE_NODE_HEALTH', { node_id: node.node_id });
    res.status(201).json(health);
  }));

  router.get('/commission/sessions', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), asyncHandler(async (req, res) => {
    const sessions = await CommissioningSession.find().populate('room').populate('assigned_by', 'username email');
    res.json(sessions);
  }));

  router.post('/commission/discover', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('commissionDiscover'), asyncHandler(async (req, res) => {
    const { provisional_id, node_id, mac_address, capabilities, signal_data } = req.body;
    const session = await CommissioningSession.findOneAndUpdate(
      { provisional_id },
      { node_id, mac_address, capabilities, signal_data, status: 'DISCOVERED' },
      { upsert: true, new: true }
    );
    await recordAudit(req.userId, 'DISCOVER_NODE', { provisional_id, node_id, mac_address });
    res.status(201).json(session);
  }));

  router.post('/commission/assign', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('commissionAssign'), asyncHandler(async (req, res) => {
    const { provisional_id, room_id, confirmed_by, assignment_method } = req.body;
    const session = await CommissioningSession.findOne({ provisional_id });
    if (!session) return res.status(404).json({ error: 'Commissioning session not found' });

    let room = await Room.findOne({ roomId: room_id });
    if (!room) {
      room = new Room({ roomId: room_id, name: room_id, type: 'General' });
      await room.save();
    }

    session.room = room._id;
    session.assigned_by = req.userId;
    session.assigned_at = new Date();
    session.status = 'ASSIGNED';
    await session.save();

    if (session.node_id) {
      await SensorNode.findOneAndUpdate(
        { node_id: session.node_id },
        {
          room: room._id,
          configured_room: room._id,
          commissioning_method: assignment_method === 'MANUAL_CONFIRMATION' ? 'MANUAL' : 'AUTO',
          commissioned_by: req.userId,
          commissioned_at: new Date(),
          status: 'ONLINE'
        },
        { upsert: true, new: true }
      );
    }

    await recordAudit(req.userId, 'ASSIGN_NODE', { provisional_id, room_id, confirmed_by });
    res.json(session);
  }));

  router.post('/commission/validate', verifyToken, requireRole(['ADMIN', 'TECHNICIAN']), validate('commissionValidate'), asyncHandler(async (req, res) => {
    const { node_id, room_id, validation_tests } = req.body;
    const node = await SensorNode.findOne({ node_id }).populate('room');
    if (!node) return res.status(404).json({ error: 'Sensor node not found' });

    const room = await Room.findOne({ roomId: room_id });
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const pass = node.room && node.room.roomId === room_id;
    const validation_result = {
      passed: pass,
      checked: validation_tests,
      nodeRoom: node.room ? node.room.roomId : null,
      expectedRoom: room_id
    };

    await CommissioningSession.findOneAndUpdate(
      { node_id },
      {
        status: pass ? 'VALIDATED' : 'FAILED',
        validation_tests,
        validation_result,
        validation_notes: pass ? 'Commissioning validation passed' : 'Room mismatch or node not assigned'
      },
      { upsert: true, new: true }
    );

    await recordAudit(req.userId, 'VALIDATE_NODE', { node_id, room_id, validation_tests, result: validation_result.passed });
    res.json(validation_result);
  }));

  return router;
};

function createBeaconsRouter() {
  const router = express.Router();

  router.get('/', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
    const beacons = await Beacon.find().populate('room');
    res.json(beacons);
  }));

  router.post('/', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
    const { uuid, room_id, description } = req.body;
    let room = null;
    if (room_id) {
      room = await Room.findOne({ roomId: room_id });
      if (!room) {
        room = new Room({ roomId: room_id, name: room_id, type: 'General' });
        await room.save();
      }
    }
    const b = await Beacon.findOneAndUpdate({ uuid }, { uuid, room: room?._id, description }, { upsert: true, new: true });
    res.status(201).json(b);
  }));

  router.delete('/:id', verifyToken, requireRole(['ADMIN']), asyncHandler(async (req, res) => {
    await Beacon.findByIdAndDelete(req.params.id);
    res.json({ message: 'Beacon deleted' });
  }));

  return router;
}

module.exports.createBeaconsRouter = createBeaconsRouter;
