const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  node_id: { type: String },
  pm1: { type: Number },
  pm25: { type: Number },
  pm10: { type: Number },
  pm25_a: { type: Number },
  pm25_b: { type: Number },
  pm10_a: { type: Number },
  pm10_b: { type: Number },
  tvoc: { type: Number },
  eco2: { type: Number },
  temperature: { type: Number },
  humidity: { type: Number },
  methane: { type: Number },
  lpg: { type: Number },
  co: { type: Number },
  hydrogen: { type: Number },
  gas: { type: Number },
  aqi: { type: Number },
  aqi_status: { type: String }, // e.g., 'Good', 'Moderate', 'Unhealthy'
  source: { type: String, default: 'esp32' }, // 'esp32' | 'purpleair' — identifies data origin
  timestamp: { type: Date, default: Date.now }
});

sensorReadingSchema.index({ room: 1, timestamp: -1 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
