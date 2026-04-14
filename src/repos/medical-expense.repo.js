const crypto = require('crypto');

/**
 * Medical Expenses Repository — prepared statement CRUD for medical_expenses table.
 */
class MedicalExpenseRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO medical_expenses (id, user_id, family_member_id, appointment_id, category, description, amount, currency, expense_date, payment_method, insurance_claimed, receipt_document_id, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM medical_expenses WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM medical_expenses WHERE id = ? AND user_id = ?'),
      countByUser: db.prepare('SELECT COUNT(*) as cnt FROM medical_expenses WHERE user_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.appointment_id || null, data.category || 'consultation',
      data.description, data.amount,
      data.currency || 'INR', data.expense_date,
      data.payment_method || '', data.insurance_claimed || 0,
      data.receipt_document_id || null, data.notes || ''
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
    if (filters.payment_method !== undefined) { where += ' AND payment_method = ?'; params.push(filters.payment_method); }
    if (filters.from) { where += ' AND expense_date >= ?'; params.push(filters.from); }
    if (filters.to) { where += ' AND expense_date <= ?'; params.push(filters.to); }

    const total = this.db.prepare(`SELECT COUNT(*) as cnt FROM medical_expenses ${where}`).get(...params).cnt;

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const sortCol = ['created_at', 'expense_date', 'amount'].includes(filters.sort) ? filters.sort : 'expense_date';
    const sortOrder = filters.order === 'asc' ? 'ASC' : 'DESC';

    const rows = this.db.prepare(
      `SELECT * FROM medical_expenses ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    return { data: rows, total, page, limit };
  }

  summary(userId, filters = {}) {
    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (filters.family_member_id) { where += ' AND family_member_id = ?'; params.push(filters.family_member_id); }
    if (filters.from) { where += ' AND expense_date >= ?'; params.push(filters.from); }
    if (filters.to) { where += ' AND expense_date <= ?'; params.push(filters.to); }

    const byCategory = this.db.prepare(
      `SELECT category, SUM(amount) as total, COUNT(*) as count FROM medical_expenses ${where} GROUP BY category ORDER BY total DESC`
    ).all(...params);

    const overall = this.db.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM medical_expenses ${where}`
    ).get(...params);

    return { by_category: byCategory, total: overall.total, count: overall.count };
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'appointment_id', 'category', 'description', 'amount', 'currency', 'expense_date', 'payment_method', 'insurance_claimed', 'receipt_document_id', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE medical_expenses SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = MedicalExpenseRepo;
