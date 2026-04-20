const crypto = require('crypto');

/**
 * First Aid Items Repository — prepared statement CRUD for first_aid_items table.
 */
class FirstAidRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO first_aid_items (id, user_id, name, category, quantity, expiry_date, is_available, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM first_aid_items WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM first_aid_items WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM first_aid_items WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.name,
      data.category || 'general', data.quantity ?? 1,
      data.expiry_date || null, data.is_available ?? 1,
      data.notes || ''
    );
    return this.stmts.getById.get(id, userId);
  }

  findById(id, userId) {
    return this.stmts.getById.get(id, userId);
  }

  findAll(userId, filters = {}) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.category) { where += ' AND category = ?'; params.push(filters.category); }
    if (filters.is_available !== undefined) { where += ' AND is_available = ?'; params.push(filters.is_available); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM first_aid_items ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['created_at', 'name', 'expiry_date'].includes(filters.sort) ? filters.sort : 'created_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM first_aid_items ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  findExpiring(userId, days = 30) {
    return this.db.prepare(
      `SELECT * FROM first_aid_items WHERE user_id = ? AND expiry_date IS NOT NULL AND expiry_date <= date('now', '+' || ? || ' days') AND is_available = 1 ORDER BY expiry_date ASC`
    ).all(userId, days);
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['name', 'category', 'quantity', 'expiry_date', 'is_available', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE first_aid_items SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = FirstAidRepo;
