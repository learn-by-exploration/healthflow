const crypto = require('crypto');

/**
 * Health Conditions Repository — prepared statement CRUD for health_conditions table.
 */
class ConditionRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO health_conditions (id, user_id, family_member_id, name, severity, diagnosed_date, diagnosing_doctor, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM health_conditions WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM health_conditions WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM health_conditions WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.name, data.severity || 'moderate',
      data.diagnosed_date || null, data.diagnosing_doctor || '',
      data.status || 'active', data.notes || ''
    );
    return this.stmts.getById.get(id, userId);
  }

  findById(id, userId) {
    return this.stmts.getById.get(id, userId);
  }

  findAll(userId, filters = {}) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.family_member_id) { where += ' AND family_member_id = ?'; params.push(filters.family_member_id); }
    if (filters.severity) { where += ' AND severity = ?'; params.push(filters.severity); }
    if (filters.status) { where += ' AND status = ?'; params.push(filters.status); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM health_conditions ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['created_at', 'name', 'diagnosed_date'].includes(filters.sort) ? filters.sort : 'created_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM health_conditions ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'name', 'severity', 'diagnosed_date', 'diagnosing_doctor', 'status', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE health_conditions SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = ConditionRepo;
