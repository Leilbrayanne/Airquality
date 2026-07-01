require('dotenv').config({ path: '../backend/.env' });
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { processReadingForAlerts, initNotifier } = require('../backend/services/notifier');
const Room = require('../backend/models/Room');
const SensorReading = require('../backend/models/SensorReading');

async function runTest() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect('mongodb://127.0.0.1:27017/hospital_aqi');
  
  console.log("Initializing Ethereal Test Notifier...");
  await initNotifier();
  
  // Find a room to test with
  let room = await Room.findOne();
  if (!room) {
    room = new Room({ name: "Test ICU", roomId: "TEST-001" });
    await room.save();
  }

  // Create a fake critical reading
  const reading = new SensorReading({
    room: room._id,
    node_id: "TEST-NODE",
    pm1: 10,
    pm25: 9999, // CRITICAL
    pm10: 9999,
    tvoc: 5000,
    temperature: 45,
    humidity: 90,
    aqi: 500,
    aqi_status: "HAZARDOUS"
  });
  await reading.save();

  console.log("Processing fake CRITICAL reading...");
  
  // Mock socket.io
  const ioMock = {
    to: () => ({ emit: () => {} })
  };

  // Capture console.log to get the Ethereal URL
  const originalLog = console.log;
  let previewUrl = "";
  console.log = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Preview URL:')) {
      previewUrl = args[1];
    }
    originalLog.apply(console, args);
  };

  await processReadingForAlerts(reading, room, ioMock);

  if (previewUrl) {
    console.log("\n=======================================================");
    console.log("✅ EMAIL SUCCESSFULLY GENERATED AND SENT!");
    console.log("Open this URL in your browser to view the email & PDF:");
    console.log(previewUrl);
    console.log("=======================================================\n");
  } else {
    console.log("Failed to capture Ethereal URL. Is maintenance mode on, or cooldown active?");
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
