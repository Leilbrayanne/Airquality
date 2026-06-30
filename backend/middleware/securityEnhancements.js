// Enhanced Security Middleware for Production
// Import this in server.js for additional security headers

const helmet = require('helmet');

/**
 * Enhanced security middleware for production environments
 * Provides additional protections beyond basic securityHeaders.js
 */
const securityEnhancements = (app) => {
  // Use helmet for comprehensive security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    referrerPolicy: {
      policy: 'no-referrer'
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true
  }));

  // Additional custom headers
  app.use((req, res, next) => {
    // Prevent browser from guessing MIME types
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions policy
    res.setHeader('Permissions-Policy', 
      'camera=(), microphone=(), geolocation=(), interest-cohort=()');
    
    // Cross-origin resource sharing
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    
    next();
  });
};

/**
 * Rate limiting configuration for production
 */
const productionRateLimits = {
  // Authentication endpoints (very strict)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // API endpoints (moderate)
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per IP
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Report generation (strict - heavy operations)
  reports: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 reports per IP per hour
    message: 'Too many report requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Public endpoints (more lenient)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per IP
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

/**
 * Input validation and sanitization middleware
 */
const inputValidation = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      return str
        .replace(/[<>]/g, '') // Remove HTML tags
        .trim()
        .substring(0, 1000); // Limit length
    };
    
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    };
    
    req.body = sanitizeObject(req.body);
  }
  
  // Validate email format if present
  if (req.body && req.body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(req.body.email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }
  }
  
  next();
};

/**
 * Request logging for security monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Capture response details
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Log security-relevant information
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.userId || 'anonymous',
      userRole: req.userRole || 'anonymous'
    };
    
    // Only log 4xx and 5xx status codes for security monitoring
    if (res.statusCode >= 400) {
      console.warn('[SECURITY] Failed request:', logEntry);
      
      // Additional logging for authentication failures
      if (req.url.includes('/auth/login') && res.statusCode === 401) {
        console.warn('[SECURITY] Failed login attempt:', {
          ...logEntry,
          email: req.body?.email ? req.body.email.substring(0, 3) + '***' : 'none'
        });
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * CORS configuration for production
 */
const productionCors = (allowedOrigins) => {
  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Validate against allowed origins
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn('[SECURITY] CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Response-Time'],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204
  };
};

module.exports = {
  securityEnhancements,
  productionRateLimits,
  inputValidation,
  securityLogger,
  productionCors
};