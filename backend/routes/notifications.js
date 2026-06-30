const express = require('express');
const NotificationConfig = require('../models/NotificationConfig');
const { verifyToken, requireRole } = require('../middleware/auth');
const { recordAudit } = require('../services/audit');
const asyncHandler = require('../middleware/asyncHandler');

module.exports = function createNotificationsRouter(io) {
  const router = express.Router();

  router.get('/config', verifyToken, requireRole(['ADMIN', 'TECHNICIAN', 'STAFF']), asyncHandler(async (req, res) => {
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = new NotificationConfig({
        emailRecipients: [{ email: 'admin@PureAir.cm', isActive: true }]
      });
      await config.save();
    }
    res.json(config);
  }));

  router.put('/config', verifyToken, requireRole(['ADMIN']), validate('notifications'), asyncHandler(async (req, res) => {
    const { emailRecipients, alertCooldown, maintenanceMode, predictiveEnabled } = req.body;
    let config = await NotificationConfig.findOne();
    if (!config) {
      config = new NotificationConfig({ emailRecipients, alertCooldown, maintenanceMode, predictiveEnabled });
    } else {
      if (emailRecipients) config.emailRecipients = emailRecipients;
      if (alertCooldown !== undefined) config.alertCooldown = alertCooldown;
      if (maintenanceMode !== undefined) config.maintenanceMode = maintenanceMode;
      if (predictiveEnabled !== undefined) config.predictiveEnabled = predictiveEnabled;
    }
    config.lastUpdated = Date.now();
    await config.save();

    if (maintenanceMode !== undefined) {
      // No explicit AppError needed here; validation ensures proper input
      io.emit('system/config', config);
    }

    res.json(config);
  }));

  return router;
};
