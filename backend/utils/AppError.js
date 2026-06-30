// backend/utils/AppError.js
// Centralized custom error class for expressive error handling
class AppError extends Error {
  /**
   * @param {string} message Human‑readable error message
   * @param {number} statusCode HTTP status code (e.g., 400, 404, 500)
   * @param {boolean} [isOperational=true] Whether this is an expected error
   */
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}
module.exports = AppError;
