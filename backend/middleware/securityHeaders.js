// backend/middleware/securityHeaders.js
module.exports = (req, res, next) => {
  // Content Security Policy - adjust as needed for the frontend assets
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss: https:;",
  );
  // Enforce HTTPS for browsers supporting HSTS
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Clickjacking protection
  res.setHeader("X-Frame-Options", "DENY");
  // Referrer policy
  res.setHeader("Referrer-Policy", "no-referrer");
  // XSS protection (legacy header, modern browsers use CSP)
  res.setHeader("X-XSS-Protection", "0");
  next();
};
