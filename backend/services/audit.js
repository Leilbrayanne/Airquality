const AuditLog = require('../models/AuditLog');

const recordAudit = async (userId, action, details) => {
  try {
    const log = new AuditLog({
      user: userId,
      action,
      details,
      timestamp: new Date()
    });
    await log.save();
    console.log(`Audit Log: ${action} by user ${userId}`);
  } catch (err) {
    console.error('Failed to record audit log:', err);
  }
};

module.exports = { recordAudit };
