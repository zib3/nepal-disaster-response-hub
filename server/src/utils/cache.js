// Simple in-memory cache implementation
// TODO: Replace with Redis or similar for production use

const cache = new Map();

export const clearRedisCache = async () => {
  cache.clear();
  return Promise.resolve();
};

export const getCacheKey = (...args) => args.join(':');

export const getCache = (key) => cache.get(key);

export const setCache = (key, value, ttl = 3600) => {
  cache.set(key, value);
  setTimeout(() => cache.delete(key), ttl * 1000);
};

export const deleteCache = (key) => cache.delete(key);

export const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};
