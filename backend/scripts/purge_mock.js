require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const NodeHealth = require('../models/NodeHealth');

async function purgeData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  const deletedReadings = await SensorReading.deleteMany({});
  const deletedAlerts = await Alert.deleteMany({});
  const deletedHealth = await NodeHealth.deleteMany({});

  console.log(`Deleted ${deletedReadings.deletedCount} readings.`);
  console.log(`Deleted ${deletedAlerts.deletedCount} alerts.`);
  console.log(`Deleted ${deletedHealth.deletedCount} health records.`);

  process.exit(0);
}

purgeData().catch(err => {
  console.error(err);
  process.exit(1);
});
