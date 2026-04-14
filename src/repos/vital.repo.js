const crypto = require('crypto');

/**
 * Vitals Repository — prepared statement CRUD for vitals table.
 */
class VitalRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO vitals (id, user_id, family_member_id, type, value, value_secondary, unit, measured_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM vitals WHERE id = ? AND user_id = ?'),
      update: null, // built dynamically
      delete: db.prepare('DELETE FROM vitals WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM vitals WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    const measuredAt = data.measured_at || new Date().toISOString();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.type, data.value, data.value_secondary || null,
      data.unit || '', measuredAt, data.notes || ''
    );
    return this.stmts.getById.get(id, userId);
  }

  findById(id, userId) {
    return this.stmts.getById.get(id, userId);
  }

  findAll(userId, filters = {}) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.type) { where += ' AND type = ?'; params.push(filters.type); }
    if (filters.family_member_id) { where += ' AND family_member_id = ?'; params.push(filters.family_member_id); }
    if (filters.from) { where += ' AND measured_at >= ?'; params.push(filters.from + 'T00:00:00.000Z'); }
    if (filters.to) { where += ' AND measured_at <= ?'; params.push(filters.to + 'T23:59:59.999Z'); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM vitals ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['measured_at', 'type', 'created_at'].includes(filters.sort) ? filters.sort : 'measured_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM vitals ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'type', 'value', 'value_secondary', 'unit', 'measured_at', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE vitals SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }

  getTrends(userId, filters = {}) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.type) { where += ' AND type = ?'; params.push(filters.type); }
    if (filters.family_member_id) { where += ' AND family_member_id = ?'; params.push(filters.family_member_id); }
    if (filters.from) { where += ' AND measured_at >= ?'; params.push(filters.from + 'T00:00:00.000Z'); }
    if (filters.to) { where += ' AND measured_at <= ?'; params.push(filters.to + 'T23:59:59.999Z'); }

    const rows = this.db.prepare(`
      SELECT type, 
             COUNT(*) as count,
             ROUND(AVG(value), 2) as avg_value,
             MIN(value) as min_value,
             MAX(value) as max_value,
             ROUND(AVG(value_secondary), 2) as avg_secondary,
             MIN(value_secondary) as min_secondary,
             MAX(value_secondary) as max_secondary
      FROM vitals ${where}
      GROUP BY type
      ORDER BY type
    `).all(...params);

    return { data: rows };
  }
}

module.exports = VitalRepo;
