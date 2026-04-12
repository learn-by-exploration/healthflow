/**
 * Authentication middleware for HealthFlow.
 * Reads hf_sid cookie, validates session, sets req.userId.
 */

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx < 0) return;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  });
  return cookies;
}

function createAuthMiddleware(db) {
  function requireAuth(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies.hf_sid;

    if (!sid) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    }

    const session = db.prepare(
      "SELECT * FROM sessions WHERE sid = ? AND expires_at > datetime('now')"
    ).get(sid);

    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid', code: 'UNAUTHORIZED' });
    }

    req.userId = session.user_id;
    req.sessionId = sid;
    req.authMethod = 'session';

    // Sliding window: extend session if it will expire in less than half the max age
    const config = require('../config');
    const halfLife = Math.floor(config.session.maxAgeDays / 2) || 3;
    db.prepare(`UPDATE sessions SET expires_at = datetime('now', '+' || ? || ' days')
      WHERE sid = ? AND expires_at < datetime('now', '+' || ? || ' days')`).run(
      config.session.maxAgeDays, sid, halfLife
    );

    next();
  }

  function optionalAuth(req, res, next) {
    const cookies = parseCookies(req.headers.cookie);
    const sid = cookies.hf_sid;

    if (sid) {
      const session = db.prepare(
        "SELECT * FROM sessions WHERE sid = ? AND expires_at > datetime('now')"
      ).get(sid);
      if (session) {
        req.userId = session.user_id;
        req.sessionId = sid;
        req.authMethod = 'session';
      }
    }
    next();
  }

  return { requireAuth, optionalAuth };
}

module.exports = createAuthMiddleware;
