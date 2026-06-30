require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Room = require('../models/Room');
const SensorReading = require('../models/SensorReading');
const { calculateAQI } = require('../services/aqi');

async function generateHistory() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  console.log('Connected to DB');

  const rooms = await Room.find();
  if (rooms.length === 0) {
    console.log('No rooms found. Please run seed.js first.');
    process.exit(1);
  }

  const readings = [];
  const now = new Date();
  
  // 24 hours = 24 * 60 minutes. 1 reading every 5 minutes = 288 readings
  for (const room of rooms) {
    let basePm = 10;
    if (room.roomId === 'LAB' || room.roomId === 'OR-1') basePm = 25;
    
    let currentPm = basePm;
    
    for (let i = 288; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
      
      // Random walk for PM2.5
      currentPm = Math.max(1, currentPm + (Math.random() - 0.5) * 5);
      
      const pm25 = parseFloat(currentPm.toFixed(1));
      const { aqi, status } = calculateAQI(pm25);
      
      readings.push({
        room: room._id,
        node_id: `MOCK-${room.roomId}`,
        pm1: parseFloat((pm25 * 0.6).toFixed(1)),
        pm25: pm25,
        pm10: parseFloat((pm25 * 1.5).toFixed(1)),
        tvoc: Math.floor(Math.max(0, pm25 * 5 + (Math.random() - 0.5) * 50)),
        eco2: Math.floor(400 + Math.random() * 100),
        temperature: parseFloat((22 + (Math.random() - 0.5) * 2).toFixed(1)),
        humidity: parseFloat((45 + (Math.random() - 0.5) * 10).toFixed(1)),
        gas: Math.floor(200 + Math.random() * 50),
        aqi,
        aqi_status: status,
        timestamp
      });
    }
  }

  await SensorReading.insertMany(readings);
  console.log(`Successfully generated ${readings.length} historical readings for 24 hours.`);
  process.exit(0);
}

generateHistory().catch(err => {
  console.error(err);
  process.exit(1);
});
