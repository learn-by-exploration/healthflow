const crypto = require('crypto');

/**
 * Medical Documents Repository — prepared statement CRUD for medical_documents table.
 */
class DocumentRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO medical_documents (id, user_id, family_member_id, appointment_id, type, title, file_name, file_path, file_size, mime_type, notes, document_date, doctor_name, hospital)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM medical_documents WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM medical_documents WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM medical_documents WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.appointment_id || null, data.type,
      data.title, data.file_name,
      data.file_path, data.file_size,
      data.mime_type, data.notes || '',
      data.document_date || null, data.doctor_name || '',
      data.hospital || ''
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
    if (filters.appointment_id) { where += ' AND appointment_id = ?'; params.push(filters.appointment_id); }
    if (filters.type) { where += ' AND type = ?'; params.push(filters.type); }
    if (filters.from) { where += ' AND document_date >= ?'; params.push(filters.from); }
    if (filters.to) { where += ' AND document_date <= ?'; params.push(filters.to); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM medical_documents ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['created_at', 'document_date', 'title'].includes(filters.sort) ? filters.sort : 'created_at';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM medical_documents ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'appointment_id', 'type', 'title', 'file_name', 'file_path', 'file_size', 'mime_type', 'notes', 'document_date', 'doctor_name', 'hospital']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE medical_documents SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = DocumentRepo;
