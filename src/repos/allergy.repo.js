const crypto = require('crypto');

/**
 * Allergies Repository — prepared statement CRUD for allergies table.
 */
class AllergyRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO allergies (id, user_id, family_member_id, allergen, category, severity, reaction, diagnosed_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM allergies WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM allergies WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM allergies WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.allergen, data.category || 'other',
      data.severity || 'moderate', data.reaction || '',
      data.diagnosed_date || null, data.notes || ''
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
    if (filters.category) { where += ' AND category = ?'; params.push(filters.category); }
    if (filters.severity) { where += ' AND severity = ?'; params.push(filters.severity); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM allergies ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['created_at', 'allergen'].includes(filters.sort) ? filters.sort : 'created_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM allergies ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'allergen', 'category', 'severity', 'reaction', 'diagnosed_date', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE allergies SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = AllergyRepo;
