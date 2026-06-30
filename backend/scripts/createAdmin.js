// createAdmin.js
const mongoose = require('../models/User');
const User = require('../models/User');
const connect = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hospital_aqi');
};
(async () => {
  try {
    await connect();
    const count = await User.countDocuments();
    if (count > 0) {
      console.log('Admin already exists, users count:', count);
      process.exit(0);
    }
    const admin = new User({
      username: 'admin',
      password_hash: 'admin123', // will be hashed by pre-save
      role: 'ADMIN',
      email: 'admin@hospital.cm'
    });
    await admin.save();
    console.log('Admin created');
    process.exit(0);
  } catch (e) {
    console.error('Error creating admin', e);
    process.exit(1);
  }
})();
