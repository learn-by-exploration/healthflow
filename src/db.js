const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const runMigrations = require('./migrate');

const logger = (() => { try { return require('./logger'); } catch { return console; } })();

/**
 * Initialise the database: open, pragmas, migrations.
 * Returns { db } so callers keep using the same variable names.
 */
function initDatabase(dbDir) {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  const dbPath = path.join(dbDir, 'healthflow.db');

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch {}

  // ─── Auth tables ───
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      remember INTEGER DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS login_attempts (
      email TEXT PRIMARY KEY,
      attempts INTEGER DEFAULT 0,
      first_attempt_at DATETIME,
      locked_until DATETIME
    );
  `);

  // Run numbered migrations
  const result = runMigrations(db);
  if (result.applied > 0) {
    logger.info({ applied: result.applied, total: result.total }, 'Migrations applied');
  }

  return { db };
}

module.exports = initDatabase;
