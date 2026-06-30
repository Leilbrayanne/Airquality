const mongoose = require('mongoose');

const sensorNodeSchema = new mongoose.Schema({
  node_id: { type: String, required: true, unique: true },
  mac_address: { type: String, unique: true, sparse: true },
  hardware_version: { type: String },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  configured_room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  detected_room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  location_method: { 
    type: String,
    enum: ['TOPIC', 'MANUAL', 'HYBRID'],
    default: 'TOPIC'
  },
  location_confidence: { type: Number, min: 0, max: 100, default: 100 },
  firmware: { type: String },
  wifi_ssid: { type: String },
  status: { type: String, enum: ['COMMISSIONING', 'ONLINE', 'OFFLINE', 'DEGRADED', 'MAINTENANCE', 'DECOMMISSIONED'], default: 'COMMISSIONING' },
  rssi: { type: Number },
  battery_level: { type: Number, min: 0, max: 100 },
  battery_voltage: { type: Number },
  uptime: { type: Number },
  packet_loss_rate: { type: Number },
  last_reboot: { type: Date },
  commissioned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  commissioned_at: { type: Date },
  commissioning_method: { type: String, enum: ['AUTO', 'MANUAL', 'ASSISTED'] },
  health_score: { type: Number, min: 0, max: 100, default: 100 },
  last_heartbeat: { type: Date },
  last_data_received: { type: Date },
  last_alert: { type: Date }
}, { timestamps: true });



module.exports = mongoose.model('SensorNode', sensorNodeSchema);
