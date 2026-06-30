const mongoose = require('mongoose');

const commissioningSessionSchema = new mongoose.Schema({
  provisional_id: { type: String, required: true, unique: true },
  node_id: { type: String },
  mac_address: { type: String },
  capabilities: [{ type: String }],
  signal_data: { type: mongoose.Schema.Types.Mixed },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigned_at: { type: Date },
  status: { type: String, enum: ['DISCOVERED', 'ASSIGNED', 'VALIDATED', 'COMPLETED', 'FAILED'], default: 'DISCOVERED' },
  validation_tests: [{ type: String }],
  validation_result: { type: mongoose.Schema.Types.Mixed },
  validation_notes: { type: String }
}, { timestamps: true });



module.exports = mongoose.model('CommissioningSession', commissioningSessionSchema);
