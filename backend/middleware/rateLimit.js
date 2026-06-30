const rateLimit = require('express-rate-limit');

// Helper: treat localhost as safe during development
const isLocalRequest = (req) => {
  const ip = (req.ip || req.connection?.remoteAddress || '') + '';
  return ip === '::1' || ip === '127.0.0.1' || ip.endsWith('127.0.0.1');
};

// General API rate limit: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for local requests when not in production
    return process.env.NODE_ENV !== 'production' && isLocalRequest(req);
  }
});

// Auth endpoints: allow higher limits during development and skip localhost
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && isLocalRequest(req);
  }
});

// Upload/report generation: 10 per hour
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Report generation limit exceeded. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV !== 'production' && isLocalRequest(req);
  }
});

module.exports = { apiLimiter, authLimiter, reportLimiter };
