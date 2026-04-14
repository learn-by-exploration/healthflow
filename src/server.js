const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const initDatabase = require('./db');
const createAuthMiddleware = require('./middleware/auth');
const createCsrfMiddleware = require('./middleware/csrf');
const errorHandler = require('./middleware/error-handler');
const { createAuthRateLimiter, createGlobalRateLimiter } = require('./middleware/rate-limit');
const logger = require('./logger');
const EmergencyCardRepo = require('./repos/emergency-card.repo');
const EmergencyCardService = require('./services/emergency-card.service');

const app = express();
const PORT = config.port;

// ─── Trust proxy when behind reverse proxy ───
if (config.trustProxy) {
  app.set('trust proxy', 1);
}

const { db } = initDatabase(config.dbDir);
const deps = { db, dbDir: config.dbDir };

// Periodic session cleanup
if (!config.isTest) {
  setInterval(() => {
    try {
      db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
    } catch (err) { logger.warn({ err }, 'Session cleanup failed'); }
  }, 24 * 60 * 60 * 1000);
}

const { requireAuth, optionalAuth } = createAuthMiddleware(db);

// ─── Security headers ───
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.trustProxy ? [] : null
    }
  },
  strictTransportSecurity: config.trustProxy,
  referrerPolicy: { policy: 'same-origin' }
}));

// ─── No-cache on API responses ───
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// ─── CORS ───
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (config.allowedOrigins.length > 0 && config.allowedOrigins.includes(origin)) return callback(null, true);
    if (!config.isProd) return callback(null, true);
    try {
      const url = new URL(origin);
      const host = url.hostname;
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
        return callback(null, true);
      }
    } catch {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ─── Rate limiting ───
if (!config.isTest) {
  app.use('/api/', createGlobalRateLimiter(config));
}

const authLimiter = createAuthRateLimiter(config);

app.use(express.json({ limit: '1mb' }));

// ─── Request ID middleware ───
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  req.requestId = requestId;
  next();
});

app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.body) req.body = {};
  next();
});

// ─── Compression ───
app.use(compression());

app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1d', etag: true }));

// ─── CSRF Protection ───
const csrfProtection = createCsrfMiddleware();
if (!config.isTest) {
  app.use('/api', csrfProtection);
}

// ─── Auth middleware on all /api/* routes ───
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/') || req.path.startsWith('/health')) return optionalAuth(req, res, next);
  requireAuth(req, res, next);
});

// ─── Auth routes (with rate limiting) ───
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter);
app.use(require('./routes/auth')(deps));

// ─── Health check routes ───
app.use(require('./routes/health')(deps));

// ─── Resource routes ───
app.use(require('./routes/vitals')(deps));
app.use(require('./routes/medications')(deps));
app.use(require('./routes/appointments')(deps));
app.use(require('./routes/emergency-cards')(deps));
app.use(require('./routes/family-members')(deps));
app.use(require('./routes/conditions')(deps));
app.use(require('./routes/allergies')(deps));
app.use(require('./routes/documents')(deps));
app.use(require('./routes/medical-expenses')(deps));
app.use(require('./routes/first-aid')(deps));

// ─── Shareable emergency card (public, no auth) ───
const emergencyCardService = new EmergencyCardService(new EmergencyCardRepo(db));
app.get('/api/emergency-cards/:id/share', (req, res) => {
  try {
    const card = emergencyCardService.getShareable(req.params.id);
    res.json(card);
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Login page ───
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'login.html'));
});

// ─── API 404 catch-all ───
app.all('/api/{*splat}', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── SPA fallback ───
app.get('/{*splat}', (req, res) => {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/hf_sid=([^;]+)/);
  if (match) {
    const session = db.prepare("SELECT * FROM sessions WHERE sid = ? AND expires_at > datetime('now')").get(match[1]);
    if (session) {
      return res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    }
  }
  res.redirect('/login');
});

// ─── Global error handler ───
app.use(errorHandler);

// ─── Start server when run directly ───
if (require.main === module) {
  try {
    const validateEnv = require('./validate-env');
    validateEnv(process.env);
  } catch (err) {
    logger.fatal({ err: err.message }, 'Startup aborted: invalid environment');
    console.error(err.message);
    process.exit(1);
  }

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — forcing shutdown');
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled rejection — forcing shutdown');
    process.exit(1);
  });

  const HOST = config.host;
  const server = app.listen(PORT, HOST, () => logger.info({ port: PORT, host: HOST, version: config.version }, 'HealthFlow started'));

  // ─── Graceful shutdown ───
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.getConnections((err, count) => {
      logger.info({ signal, activeConnections: err ? 'unknown' : count }, 'Shutdown signal received, draining connections...');
    });
    server.close(() => {
      try { db.close(); logger.info('Database closed'); } catch {}
      logger.info('Server stopped cleanly');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      try { db.close(); } catch {}
      process.exit(1);
    }, config.shutdownTimeoutMs);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = app;
