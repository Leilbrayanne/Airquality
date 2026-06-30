const mongoose = require('mongoose');

const NotificationConfigSchema = new mongoose.Schema({
  emailRecipients: [{
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true }
  }],
  alertCooldown: { type: Number, default: 300000 }, // 5 minutes in ms
  maintenanceMode: { type: Boolean, default: false },
  predictiveEnabled: { type: Boolean, default: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NotificationConfig', NotificationConfigSchema);
