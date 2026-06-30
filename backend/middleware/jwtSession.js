const { cacheGet, cacheSetex } = require('../redisClient');

// Prefix for revoked tokens set
const REVOKED_TOKENS_KEY = 'revoked_jti';

/**
 * Revoke a JWT by its jti (unique identifier).
 * Stores the jti in Redis with TTL matching token expiration.
 */
async function revokeToken(jti, expiresInSeconds) {
  if (!jti) return;
  // Set with expiration; default 24h if not provided
  const ttl = expiresInSeconds || 24 * 60 * 60;
  await cacheSetex(`${REVOKED_TOKENS_KEY}:${jti}`, ttl, 'revoked');
}

/**
 * Check if a JWT jti is revoked.
 * Returns true if revoked, false otherwise.
 */
async function isTokenRevoked(jti) {
  if (!jti) return false;
  const result = await cacheGet(`${REVOKED_TOKENS_KEY}:${jti}`);
  return !!result;
}

module.exports = { revokeToken, isTokenRevoked };
