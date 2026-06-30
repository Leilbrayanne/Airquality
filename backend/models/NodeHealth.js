const mongoose = require('mongoose');

const nodeHealthSchema = new mongoose.Schema({
  node_id: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  connectivity: {
    mqtt_connected: { type: Boolean },
    connection_duration: { type: Number },
    reconnect_count: { type: Number },
    last_disconnect_reason: { type: String }
  },
  signal: {
    rssi: { type: Number },
    snr: { type: Number },
    channel: { type: Number },
    tx_power: { type: Number }
  },
  power: {
    battery_level: { type: Number, min: 0, max: 100 },
    battery_voltage: { type: Number },
    charging_status: { type: String },
    estimated_runtime: { type: Number }
  },
  sensors: {
    pm_sensor_status: { type: String, enum: ['OK', 'DEGRADED', 'FAILED'] },
    temp_humidity_status: { type: String, enum: ['OK', 'DEGRADED', 'FAILED'] },
    gas_sensor_status: { type: String, enum: ['OK', 'DEGRADED', 'FAILED'] },
    last_calibration: { type: Date }
  },
  data_quality: {
    packet_loss_rate: { type: Number },
    outlier_count: { type: Number },
    transmission_interval: { type: Number },
    data_completeness: { type: Number }
  }
});

nodeHealthSchema.index({ node_id: 1, timestamp: -1 });

module.exports = mongoose.model('NodeHealth', nodeHealthSchema);
