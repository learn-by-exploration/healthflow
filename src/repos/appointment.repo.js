const crypto = require('crypto');

/**
 * Appointments Repository — prepared statement CRUD for appointments table.
 */
class AppointmentRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO appointments (id, user_id, family_member_id, doctor_name, hospital, type,
          appointment_date, appointment_time, duration_minutes, location, notes, status, post_visit_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM appointments WHERE id = ? AND user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.doctor_name, data.hospital || '', data.type || 'checkup',
      data.appointment_date, data.appointment_time || null,
      data.duration_minutes || null, data.location || '',
      data.notes || '', data.status || 'scheduled', data.post_visit_notes || ''
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
    if (filters.type) { where += ' AND type = ?'; params.push(filters.type); }
    if (filters.status) { where += ' AND status = ?'; params.push(filters.status); }
    if (filters.from) { where += ' AND appointment_date >= ?'; params.push(filters.from); }
    if (filters.to) { where += ' AND appointment_date <= ?'; params.push(filters.to); }
    if (filters.upcoming === 'true' || filters.upcoming === '1') {
      where += " AND appointment_date >= date('now') AND status = 'scheduled'";
    }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM appointments ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['appointment_date', 'created_at', 'doctor_name'].includes(filters.sort) ? filters.sort : 'appointment_date';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM appointments ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'doctor_name', 'hospital', 'type',
      'appointment_date', 'appointment_time', 'duration_minutes', 'location',
      'notes', 'status', 'post_visit_notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }

  findUpcoming(userId, days = 7) {
    return this.db.prepare(`
      SELECT * FROM appointments
      WHERE user_id = ? AND status = 'scheduled'
        AND appointment_date >= date('now')
        AND appointment_date <= date('now', '+' || ? || ' days')
      ORDER BY appointment_date ASC, appointment_time ASC
    `).all(userId, days);
  }
}

module.exports = AppointmentRepo;
