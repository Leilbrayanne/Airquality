const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const SensorReading = require('../models/SensorReading');
const SensorNode = require('../models/SensorNode');
const NodeHealth = require('../models/NodeHealth');
const Alert = require('../models/Alert');
const Room = require('../models/Room');
const { cacheDel, redis } = require('../redisClient');

async function purgeObsolete() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  const realNodeId = 'ESP32-AQI-Node-3076F593B25C';

  // Delete all SensorNode records except the real persistent one
  const deletedNodes = await SensorNode.deleteMany({ node_id: { $ne: realNodeId } });
  console.log(`Deleted ${deletedNodes.deletedCount} obsolete SensorNode records.`);

  // Delete all SensorReading records except the real persistent one
  const deletedReadings = await SensorReading.deleteMany({ node_id: { $ne: realNodeId } });
  console.log(`Deleted ${deletedReadings.deletedCount} obsolete SensorReading records.`);

  // Delete all NodeHealth records except the real persistent one
  const deletedHealth = await NodeHealth.deleteMany({ node_id: { $ne: realNodeId } });
  console.log(`Deleted ${deletedHealth.deletedCount} obsolete NodeHealth records.`);

  // Keep only the real alerts corresponding to the real reading/node
  const remainingReadings = await SensorReading.find({}, '_id');
  const remainingReadingIds = remainingReadings.map(r => r._id);
  const deletedAlerts = await Alert.deleteMany({ sensorReading: { $nin: remainingReadingIds } });
  console.log(`Deleted ${deletedAlerts.deletedCount} obsolete Alert records.`);

  // Invalidate Redis cache
  console.log('Invalidating Redis cache...');
  await cacheDel('api_health', 'rooms_all');

  if (redis && typeof redis.quit === 'function') {
    await redis.quit();
  }

  process.exit(0);
}

purgeObsolete().catch(err => {
  console.error(err);
  process.exit(1);
});
