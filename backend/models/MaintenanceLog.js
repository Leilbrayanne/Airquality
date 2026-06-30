const mongoose = require('mongoose');

const MaintenanceLogSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  technician: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { 
    type: String, 
    enum: ['CALIBRATION', 'FILTER_REPLACEMENT', 'SENSOR_CHECK', 'REPAIR', 'OTHER'],
    required: true 
  },
  details: { type: String, required: true },
  performedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MaintenanceLog', MaintenanceLogSchema);
