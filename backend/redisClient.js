const Redis = require('ioredis');

let available = false;

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
});

redis.on('ready', () => { available = true; });
redis.on('connect', () => { available = true; });
redis.on('error', (err) => {
  available = false;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Redis unavailable, caching disabled:', err.message);
  }
});
redis.on('close', () => { available = false; });

redis.connect().catch(() => {});

async function cacheGet(key) {
  if (!available) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function cacheSetex(key, ttl, value) {
  if (!available) return;
  try {
    await redis.setex(key, ttl, value);
  } catch {
    /* cache optional */
  }
}

async function cacheDel(...keys) {
  if (!available || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    /* cache optional */
  }
}

module.exports = { redis, cacheGet, cacheSetex, cacheDel };
