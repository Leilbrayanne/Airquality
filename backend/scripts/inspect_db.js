const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const SensorReading = require('../models/SensorReading');
const SensorNode = require('../models/SensorNode');
const NodeHealth = require('../models/NodeHealth');
const Alert = require('../models/Alert');
const Room = require('../models/Room');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  const distinctReadingNodes = await SensorReading.distinct('node_id');
  console.log('Distinct node_ids in SensorReading:', distinctReadingNodes);

  const distinctSensorNodes = await SensorNode.find({}, 'node_id status room');
  console.log('SensorNodes in DB:', distinctSensorNodes);

  const rooms = await Room.find({}, 'roomId name');
  console.log('Rooms in DB:', rooms);

  const alertsCount = await Alert.countDocuments();
  console.log('Total alerts in DB:', alertsCount);

  const healthCount = await NodeHealth.countDocuments();
  console.log('Total NodeHealth records in DB:', healthCount);

  const readingsCount = await SensorReading.countDocuments();
  console.log('Total SensorReadings in DB:', readingsCount);

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
