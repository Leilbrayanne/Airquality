const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ThresholdProfile = require('./models/ThresholdProfile');
const Room = require('./models/Room');
require('dotenv').config();

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
  
  // Clear existing
  await User.deleteMany({});
  await Room.deleteMany({});
  await ThresholdProfile.deleteMany({});

  console.log('Cleared database');

  // Create Default Threshold Profile
  const defaultProfile = new ThresholdProfile({
    name: 'Default',
    pm10: { warning: 20, critical: 50 },
    pm25: { warning: 12, critical: 35 },
    tvoc: { warning: 300, critical: 600 },
    temperature: { warningLow: 18, warningHigh: 26, criticalHigh: 30 },
    humidity: { warningLow: 30, warningHigh: 60 }
  });
  await defaultProfile.save();

  // Create Users
  const users = [
    { username: 'admin',       password: 'admin123', role: 'ADMIN',      email: 'admin@hospital.cm' },
    { username: 'technician',  password: 'tech123',  role: 'TECHNICIAN',  email: 'tech@hospital.cm'  },
    { username: 'staff',       password: 'staff123', role: 'STAFF',       email: 'staff@hospital.cm' }
  ];

  for (const u of users) {
    // Hash the password before creating user
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(u.password, salt);
    
    const user = new User({
      username: u.username,
      password_hash: password_hash,
      role: u.role,
      email: u.email
    });
    await user.save();
    console.log(`Created user: ${u.username} (${u.role})`);
  }

  // Create some rooms
  const rooms = [
    { roomId: 'ICU-1', name: 'ICU Ward A', type: 'Critical', thresholdProfile: defaultProfile._id },
    { roomId: 'ICU-2', name: 'ICU Ward B', type: 'Critical', thresholdProfile: defaultProfile._id },
    { roomId: 'OR-1', name: 'Surgery A', type: 'Surgery', thresholdProfile: defaultProfile._id }
  ];

  for (const r of rooms) {
    const room = new Room(r);
    await room.save();
    console.log(`Created room: ${r.name}`);
  }

  console.log('Seeding complete!');
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
