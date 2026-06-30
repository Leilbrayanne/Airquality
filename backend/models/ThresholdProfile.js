const mongoose = require('mongoose');

const thresholdProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  pm10: {
    warning: { type: Number, default: 20 },
    critical: { type: Number, default: 50 }
  },
  pm25: {
    warning: { type: Number, default: 12 },
    critical: { type: Number, default: 35 }
  },
  tvoc: {
    warning: { type: Number, default: 220 },
    critical: { type: Number, default: 660 }
  },
  temperature: {
    warningLow: { type: Number, default: 20 },
    warningHigh: { type: Number, default: 30 },
    criticalHigh: { type: Number, default: 50 }
  },
  humidity: {
    warningLow: { type: Number, default: 30 },
    warningHigh: { type: Number, default: 60 }
  },
  methane: {
    warning: { type: Number, default: 1000 },
    critical: { type: Number, default: 5000 }
  },
  lpg: {
    warning: { type: Number, default: 1000 },
    critical: { type: Number, default: 5000 }
  },
  co: {
    warning: { type: Number, default: 50 },
    critical: { type: Number, default: 100 }
  }
}, { timestamps: true });

module.exports = mongoose.model('ThresholdProfile', thresholdProfileSchema);
