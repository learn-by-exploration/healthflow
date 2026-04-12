const crypto = require('crypto');

/**
 * Family Members Repository — prepared statement CRUD for family_members table.
 */
class FamilyMemberRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO family_members (id, user_id, name, relation, date_of_birth, gender, blood_type, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM family_members WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM family_members WHERE id = ? AND user_id = ?'),
      findAll: db.prepare('SELECT * FROM family_members WHERE user_id = ? ORDER BY relation, name'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.name, data.relation || 'self',
      data.date_of_birth || null, data.gender || null,
      data.blood_type || null, data.notes || ''
    );
    return this.stmts.getById.get(id, userId);
  }

  findById(id, userId) {
    return this.stmts.getById.get(id, userId);
  }

  findAll(userId) {
    return this.stmts.findAll.all(userId);
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['name', 'relation', 'date_of_birth', 'gender', 'blood_type', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE family_members SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }
}

module.exports = FamilyMemberRepo;
