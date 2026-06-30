const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
// Centralized error handler
const errorHandler = (err, req, res, next) => {
  logger.error('Error:', err);
  // If error is instance of AppError, use its status and message
  if (err instanceof AppError) {
    const statusCode = err.statusCode || 500;
    const response = {
      error: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    };
    return res.status(statusCode).json(response);
  }  
  // Default error response
  const errorResponse = {
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  };

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation error';
    errorResponse.details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(errorResponse);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    errorResponse.error = 'Duplicate entry';
    errorResponse.message = 'A record with this identifier already exists';
    return res.status(409).json(errorResponse);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    errorResponse.error = 'Invalid token';
    errorResponse.message = 'Authentication token is invalid';
    return res.status(401).json(errorResponse);
  }

  if (err.name === 'TokenExpiredError') {
    errorResponse.error = 'Token expired';
    errorResponse.message = 'Please log in again';
    return res.status(401).json(errorResponse);
  }

  // Cast errors (MongoDB ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    errorResponse.error = 'Not found';
    errorResponse.message = 'The requested resource was not found';
    return res.status(404).json(errorResponse);
  }

  // Default response
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.error || errorResponse.error,
    message: err.message || errorResponse.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
