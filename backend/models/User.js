const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'STAFF', 'TECHNICIAN'], required: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  email: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password and lowercase email before saving
userSchema.pre('save', async function() {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  if (!this.isModified('password_hash')) return;
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password_hash);
};

module.exports = mongoose.model('User', userSchema);
