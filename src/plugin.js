'use strict';

/**
 * HealthFlow Plugin Adapter for Synclyf Monolith.
 *
 * Wraps all HealthFlow routes into a plugin interface.
 * Route style: ABSOLUTE paths (/api/vitals, /api/medications, etc.)
 * The monolith mounts this at /api/hf and strips the prefix.
 */

const { Router } = require('express');
const path = require('path');

module.exports = function initPlugin(context) {
  const { authDb, config, logger, eventBus } = context;

  // ─── Initialize HealthFlow's own database ───
  const initDatabase = require('./db');
  const { db } = initDatabase(config.dataDir);

  const deps = { db, dbDir: config.dataDir };

  // ─── Ensure user exists in HealthFlow DB ───
  function ensureUser(req, _res, next) {
    if (!req.userId) return next();
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!existing) {
      const authUser = authDb.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.userId);
      if (authUser) {
        db.prepare(
          'INSERT OR IGNORE INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(authUser.id, authUser.email, 'MONOLITH_MANAGED', authUser.display_name || '', authUser.created_at);
      }
    }
    next();
  }

  // ─── Build router with all HealthFlow routes ───
  const router = Router();

  // Auth stub — SPA calls /api/auth/me to verify session (interceptor rewrites to /api/hf/auth/me).
  // Auth is handled by the monolith; we just return the monolith user info.
  router.get('/api/auth/me', (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
    const hfUser = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(req.userId);
    if (!hfUser) return res.status(401).json({ error: 'User not found in HealthFlow' });
    res.json({ id: hfUser.id, email: hfUser.email, display_name: hfUser.display_name });
  });

  // Also expose /api/auth/session for compatibility
  router.get('/api/auth/session', (req, res) => {
    if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
    const hfUser = db.prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(req.userId);
    if (!hfUser) return res.status(401).json({ error: 'User not found in HealthFlow' });
    res.json({ id: hfUser.id, email: hfUser.email, display_name: hfUser.display_name });
  });

  // Mount all feature routes (absolute paths)
  router.use(require('./routes/vitals')(deps));
  router.use(require('./routes/medications')(deps));
  router.use(require('./routes/appointments')(deps));
  router.use(require('./routes/emergency-cards')(deps));
  router.use(require('./routes/family-members')(deps));
  router.use(require('./routes/conditions')(deps));
  router.use(require('./routes/allergies')(deps));
  router.use(require('./routes/documents')(deps));
  router.use(require('./routes/medical-expenses')(deps));
  router.use(require('./routes/first-aid')(deps));

  return {
    name: 'healthflow',
    router,
    ensureUser,

    healthCheck() {
      try {
        const row = db.prepare('SELECT 1 AS ok').get();
        return { status: row.ok === 1 ? 'ok' : 'error' };
      } catch (err) {
        return { status: 'error', message: err.message };
      }
    },

    shutdown() {
      try {
        db.close();
        if (logger) logger.info('HealthFlow database closed');
      } catch (err) {
        if (logger) logger.error({ err }, 'Error closing HealthFlow database');
      }
    },
  };
};
