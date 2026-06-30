const mongoose = require('mongoose');

const beaconSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  description: { type: String }
}, { timestamps: true });



module.exports = mongoose.model('Beacon', beaconSchema);
