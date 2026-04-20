const { Router } = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');

function validatePasswordStrength(password) {
  const errors = [];
  if (typeof password !== 'string' || password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  return errors;
}

module.exports = function authRoutes({ db }) {
  const router = Router();

  // ─── Register ───
  router.post('/api/auth/register', (req, res) => {
    const { email, password, display_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (typeof email !== 'string' || email.length > 254) return res.status(400).json({ error: 'Invalid email' });
    const trimmedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    const pwErrors = validatePasswordStrength(password);
    if (pwErrors.length) return res.status(400).json({ error: pwErrors[0] });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(trimmedEmail);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = bcrypt.hashSync(String(password), config.auth.saltRounds);
    const result = db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)').run(
      trimmedEmail, hash, (display_name || '').slice(0, 100)
    );

    const sid = crypto.randomUUID();
    const days = config.session.maxAgeDays;
    db.prepare("INSERT INTO sessions (sid, user_id, expires_at) VALUES (?, ?, datetime('now', ?))").run(
      sid, result.lastInsertRowid, `+${days} days`
    );

    const parts = [`hf_sid=${sid}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${days * 86400}`];
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));

    res.status(201).json({ id: result.lastInsertRowid, email: trimmedEmail });
  });

  // ─── Login ───
  router.post('/api/auth/login', (req, res) => {
    const { email, password, remember } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const trimmedEmail = String(email).trim().toLowerCase();

    // Check login attempts / lockout
    const attempt = db.prepare('SELECT * FROM login_attempts WHERE email = ?').get(trimmedEmail);
    if (attempt && attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmedEmail);
    const DUMMY_HASH = '$2a$12$LJ3m9bSPlFcTNz1Ai3FHWO5Q8elMl7dbVlMH3.FzGQRxaL2VLrVFa';
    const hashToCompare = user ? user.password_hash : DUMMY_HASH;
    const valid = bcrypt.compareSync(String(password), hashToCompare);

    if (!user || !valid) {
      // Track failed attempts
      if (attempt) {
        const attempts = attempt.attempts + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        db.prepare('UPDATE login_attempts SET attempts = ?, locked_until = ? WHERE email = ?').run(attempts, lockUntil, trimmedEmail);
      } else {
        db.prepare('INSERT INTO login_attempts (email, attempts, first_attempt_at) VALUES (?, 1, CURRENT_TIMESTAMP)').run(trimmedEmail);
      }
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Clear login attempts on success
    db.prepare('DELETE FROM login_attempts WHERE email = ?').run(trimmedEmail);

    // Update last_login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    const sid = crypto.randomUUID();
    const days = remember ? config.session.rememberMeDays : config.session.maxAgeDays;
    db.prepare("INSERT INTO sessions (sid, user_id, remember, expires_at) VALUES (?, ?, ?, datetime('now', ?))").run(
      sid, user.id, remember ? 1 : 0, `+${days} days`
    );

    const parts = [`hf_sid=${sid}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', `Max-Age=${days * 86400}`];
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') parts.push('Secure');
    res.setHeader('Set-Cookie', parts.join('; '));

    res.json({
      user: { id: user.id, email: user.email, display_name: user.display_name, created_at: user.created_at }
    });
  });

  // ─── Logout ───
  router.post('/api/auth/logout', (req, res) => {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/hf_sid=([^;]+)/);
    if (match) {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(match[1]);
    }
    res.setHeader('Set-Cookie', 'hf_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  // ─── Current User ───
  router.get('/api/auth/me', (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    res.json({ user });
  });

  // ─── Change Password ───
  router.post('/api/auth/change-password', (req, res) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }
    const pwErrors = validatePasswordStrength(String(new_password));
    if (pwErrors.length) {
      return res.status(400).json({ error: pwErrors[0] });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (!bcrypt.compareSync(String(current_password), user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(String(new_password), config.auth.saltRounds);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.userId);

    // Invalidate all sessions — force re-login
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.userId);
    res.setHeader('Set-Cookie', 'hf_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');

    res.json({ ok: true });
  });

  return router;
};
