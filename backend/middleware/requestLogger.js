const logger = require("../utils/logger");

function requestLogger(req, res, next) {
  logger.info(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`,
  );

  if (process.env.NODE_ENV !== "production") {
    const safeHeaders = { ...req.headers };
    delete safeHeaders.authorization;
    delete safeHeaders.cookie;
    console.log("Headers:", JSON.stringify(safeHeaders));
    if (
      req.body &&
      typeof req.body === "object" &&
      Object.keys(req.body).length
    ) {
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = "[FILTERED]";
      if (safeBody.currentPassword) safeBody.currentPassword = "[FILTERED]";
      if (safeBody.newPassword) safeBody.newPassword = "[FILTERED]";
      console.log("Body:", JSON.stringify(safeBody));
    }
  }

  next();
}

module.exports = requestLogger;
