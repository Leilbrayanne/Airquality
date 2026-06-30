const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const ThresholdProfile = require('./models/ThresholdProfile');
const Room = require('./models/Room');
require('dotenv').config();

// Prevent accidental seeding in production unless explicitly allowed
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SETUP_IN_PROD !== 'true') {
  console.error('✗ Refusing to run setup in production. Set ALLOW_SETUP_IN_PROD=true to override.');
  process.exit(1);
}

async function setup() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi';
  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  
  await mongoose.connect(mongoUri);
  console.log('Connected to database successfully.');

  // Check if users already exist to avoid accidentally wiping or duplicating data
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    console.log('Database is already seeded with users. Skipping initial seeding.');
    console.log('If you wish to reset the database, run: node seed.js');
    process.exit(0);
  }

  console.log('Initializing PureAir database setup...');

  // 1. Create Default Threshold Profile
  let defaultProfile = await ThresholdProfile.findOne({ name: 'Default' });
  if (!defaultProfile) {
    defaultProfile = new ThresholdProfile({
      name: 'Default',
      pm10: { warning: 20, critical: 50 },
      pm25: { warning: 12, critical: 35 },
      tvoc: { warning: 300, critical: 600 },
      temperature: { warningLow: 18, warningHigh: 26, criticalHigh: 30 },
      humidity: { warningLow: 30, warningHigh: 60 }
    });
    await defaultProfile.save();
    console.log('Created default threshold profile.');
  }

  // 2. Create Initial Users (Admin, Technician, Staff)
  const usersToSeed = [
    { username: 'admin',      password: 'admin123', role: 'ADMIN',      email: 'admin@hospital.cm' },
    { username: 'technician', password: 'tech123',  role: 'TECHNICIAN',  email: 'tech@hospital.cm'  },
    { username: 'staff',      password: 'staff123', role: 'STAFF',       email: 'staff@hospital.cm' }
  ];

  for (const u of usersToSeed) {
    const existing = await User.findOne({ email: u.email.toLowerCase() });
    if (!existing) {
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
      console.log(`Created default user: ${u.username} (${u.role}) - Email: ${u.email}`);
    }
  }

  // 3. Create Default Rooms
  const defaultRooms = [
    { roomId: 'ICU-1', name: 'ICU Ward A', type: 'ICU', thresholdProfile: defaultProfile._id },
    { roomId: 'ICU-2', name: 'ICU Ward B', type: 'ICU', thresholdProfile: defaultProfile._id },
    { roomId: 'OR-1',  name: 'Surgery A',   type: 'Surgery', thresholdProfile: defaultProfile._id }
  ];

  for (const r of defaultRooms) {
    const existing = await Room.findOne({ roomId: r.roomId });
    if (!existing) {
      const room = new Room(r);
      await room.save();
      console.log(`Created default room: ${r.name} (${r.roomId})`);
    }
  }

  console.log('✓ PureAir database setup and seeding complete!');
  process.exit(0);
}

setup().catch(err => {
  console.error('✗ Error during database setup:', err);
  process.exit(1);
});
