const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const SensorReading = require('../models/SensorReading');
const SensorNode = require('../models/SensorNode');
const NodeHealth = require('../models/NodeHealth');
const Alert = require('../models/Alert');
const Room = require('../models/Room');
const { cacheDel, redis } = require('../redisClient');

async function purge() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  // 1. Identify real rooms vs mock rooms
  const realRoomIds = ['ICU-1', 'ICU-2', 'OR-1'];
  
  // Find all rooms that are NOT real
  const mockRooms = await Room.find({ roomId: { $nin: realRoomIds } });
  const mockRoomMongoIds = mockRooms.map(r => r._id);
  const mockRoomCodes = mockRooms.map(r => r.roomId);
  console.log('Found mock rooms to delete:', mockRoomCodes);

  // Delete mock rooms
  const deletedRoomsRes = await Room.deleteMany({ roomId: { $nin: realRoomIds } });
  console.log(`Deleted ${deletedRoomsRes.deletedCount} mock rooms.`);

  // 2. Delete mock sensor nodes
  // Node IDs starting with 'ESP32-AQI-Node-' are real.
  const nodeDeletePattern = { node_id: { $not: /^ESP32-AQI-Node-/ } };
  const mockNodes = await SensorNode.find(nodeDeletePattern);
  console.log('Found mock nodes to delete:', mockNodes.map(n => n.node_id));

  const deletedNodesRes = await SensorNode.deleteMany(nodeDeletePattern);
  console.log(`Deleted ${deletedNodesRes.deletedCount} mock sensor nodes.`);

  // 3. Delete readings from mock nodes or mock rooms
  const deletedReadingsRes = await SensorReading.deleteMany({
    $or: [
      { node_id: { $not: /^ESP32-AQI-Node-/ } },
      { room: { $in: mockRoomMongoIds } }
    ]
  });
  console.log(`Deleted ${deletedReadingsRes.deletedCount} mock sensor readings.`);

  // 4. Delete health records from mock nodes
  const deletedHealthRes = await NodeHealth.deleteMany({
    node_id: { $not: /^ESP32-AQI-Node-/ }
  });
  console.log(`Deleted ${deletedHealthRes.deletedCount} mock node health records.`);

  // 5. Delete alerts associated with deleted readings or deleted rooms
  const remainingReadings = await SensorReading.find({}, '_id');
  const remainingReadingIds = remainingReadings.map(r => r._id);

  const deletedAlertsRes = await Alert.deleteMany({
    $or: [
      { room: { $in: mockRoomMongoIds } },
      { sensorReading: { $nin: remainingReadingIds } }
    ]
  });
  console.log(`Deleted ${deletedAlertsRes.deletedCount} mock alerts.`);

  // 6. Invalidate Redis cache
  console.log('Invalidating Redis cache...');
  await cacheDel('api_health', 'rooms_all');
  
  // Close Redis client to prevent hanging
  if (redis && typeof redis.quit === 'function') {
    await redis.quit();
  }

  process.exit(0);
}

purge().catch(err => {
  console.error(err);
  process.exit(1);
});
