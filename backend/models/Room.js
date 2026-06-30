const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'ICU', 'Operating Theatre', 'General Ward'
  floor: { type: String },
  building: { type: String },
  thresholdProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'ThresholdProfile' }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
