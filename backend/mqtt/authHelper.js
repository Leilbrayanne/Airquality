// backend/mqtt/authHelper.js
// Helper for optional JWT authentication of MQTT clients
// Uses the same JWT secret as the HTTP API.

const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * Verify a JWT token for MQTT client authentication.
 * If MQTT_AUTH_ENABLED is falsy, authentication is bypassed (development mode).
 * @param {string} token JWT token supplied by the client
 * @returns {object} decoded payload if valid
 * @throws {AppError} if verification fails
 */
function verifyMqttToken(token) {
  if (!process.env.MQTT_AUTH_ENABLED || process.env.MQTT_AUTH_ENABLED === 'false') {
    // Auth disabled – allow any client
    return {};
  }
  if (!token) {
    throw new AppError('Missing MQTT token', 401);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (err) {
    throw new AppError('Invalid MQTT token', 401);
  }
}

module.exports = { verifyMqttToken };
