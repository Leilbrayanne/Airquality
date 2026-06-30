const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  sensorReading: { type: mongoose.Schema.Types.ObjectId, ref: 'SensorReading' },
  parameter: { type: String, required: true }, // e.g., 'pm25', 'tvoc'
  value: { type: Number, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  status: { type: String, enum: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'], default: 'ACTIVE' },
  triggeredAt: { type: Date, default: Date.now },
  acknowledgedAt: { type: Date },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  emailSent: { type: Boolean, default: false }
});

module.exports = mongoose.model('Alert', alertSchema);
