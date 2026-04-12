const { Router } = require('express');

module.exports = function healthRoutes({ db }) {
  const router = Router();

  router.get('/api/health', (req, res) => {
    let dbOk = false;
    try { db.prepare('SELECT 1').get(); dbOk = true; } catch {}
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      uptime: Math.floor(process.uptime()),
      db: dbOk ? 'connected' : 'disconnected',
    });
  });

  router.get('/health', (req, res) => {
    let dbOk = false;
    try { db.prepare('SELECT 1').get(); dbOk = true; } catch {}
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? 'ok' : 'degraded', dbOk });
  });

  router.get('/ready', (req, res) => {
    let dbOk = false;
    try { db.prepare('SELECT 1').get(); dbOk = true; } catch {}
    if (!dbOk) return res.status(503).json({ ready: false });
    res.json({ ready: true });
  });

  return router;
};
