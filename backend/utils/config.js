// backend/utils/config.js
// Centralized configuration validation
require('dotenv').config();
const logger = require('./logger');

// Validate critical env vars
const requiredEnv = ['JWT_SECRET', 'MONGODB_URI'];
// Optional auth flag for MQTT JWT validation
if (process.env.MQTT_AUTH_ENABLED && !['true', 'false'].includes(process.env.MQTT_AUTH_ENABLED)) {
  logger.warn('⚠️ MQTT_AUTH_ENABLED should be "true" or "false". Defaulting to "false"');
}
// Ensure JWT secret is set regardless of MQTT auth
requiredEnv.push('JWT_SECRET');

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`🚨 Environment variable ${key} is missing.`);
    process.exit(1);
  }
});

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT || 5002,
  MQTT_PORT: process.env.MQTT_PORT || 1886,
  MQTT_AUTH_ENABLED: process.env.MQTT_AUTH_ENABLED || 'false',
};
