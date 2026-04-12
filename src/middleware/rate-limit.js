const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints.
 * 10 failed login attempts per 5 minutes.
 */
function createAuthRateLimiter(config) {
  if (config.isTest) {
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs: config.auth.authLimitWindowMs,
    max: config.auth.authLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again later' }
  });
}

/**
 * Global API rate limiter.
 */
function createGlobalRateLimiter(config) {
  if (config.isTest) {
    return (req, res, next) => next();
  }
  return rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
  });
}

module.exports = { createAuthRateLimiter, createGlobalRateLimiter };
