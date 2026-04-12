const crypto = require('crypto');

/**
 * Medications Repository — prepared statement CRUD for medications table.
 */
class MedicationRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO medications (id, user_id, family_member_id, name, dosage, frequency, schedule_times,
          start_date, end_date, prescribing_doctor, pharmacy, refill_date, refill_quantity,
          remaining_quantity, is_active, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM medications WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM medications WHERE id = ? AND user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.name, data.dosage || '', data.frequency || 'daily',
      data.schedule_times || '', data.start_date || null, data.end_date || null,
      data.prescribing_doctor || '', data.pharmacy || '',
      data.refill_date || null, data.refill_quantity ?? null,
      data.remaining_quantity ?? null, data.is_active ?? 1, data.notes || ''
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
    if (filters.is_active !== undefined) { where += ' AND is_active = ?'; params.push(filters.is_active); }
    if (filters.q) { where += ' AND name LIKE ?'; params.push(`%${filters.q}%`); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM medications ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const rows = this.db.prepare(
      `SELECT * FROM medications ${where} ORDER BY is_active DESC, name ASC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'name', 'dosage', 'frequency', 'schedule_times',
      'start_date', 'end_date', 'prescribing_doctor', 'pharmacy', 'refill_date',
      'refill_quantity', 'remaining_quantity', 'is_active', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE medications SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }

  findNeedingRefill(userId) {
    return this.db.prepare(`
      SELECT * FROM medications
      WHERE user_id = ? AND is_active = 1
        AND refill_date IS NOT NULL AND refill_date <= date('now', '+7 days')
      ORDER BY refill_date ASC
    `).all(userId);
  }
}

module.exports = MedicationRepo;
