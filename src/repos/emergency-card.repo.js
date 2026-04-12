const crypto = require('crypto');

/**
 * Emergency Cards Repository — prepared statement CRUD for emergency_cards table.
 */
class EmergencyCardRepo {
  constructor(db) {
    this.db = db;

    this.stmts = {
      insert: db.prepare(`
        INSERT INTO emergency_cards (id, user_id, family_member_id, blood_type, allergies,
          chronic_conditions, current_medications, emergency_contact_name, emergency_contact_phone,
          emergency_contact_relation, secondary_contact_name, secondary_contact_phone,
          insurance_provider, insurance_policy_number, insurance_group_number,
          primary_doctor, primary_doctor_phone, organ_donor, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `),
      getById: db.prepare('SELECT * FROM emergency_cards WHERE id = ? AND user_id = ?'),
      delete: db.prepare('DELETE FROM emergency_cards WHERE id = ? AND user_id = ?'),
      findByFamilyMember: db.prepare('SELECT * FROM emergency_cards WHERE user_id = ? AND family_member_id = ?'),
    };
  }

  create(userId, data) {
    const id = crypto.randomUUID();
    this.stmts.insert.run(
      id, userId, data.family_member_id || null,
      data.blood_type || 'unknown', data.allergies || '',
      data.chronic_conditions || '', data.current_medications || '',
      data.emergency_contact_name || '', data.emergency_contact_phone || '',
      data.emergency_contact_relation || '', data.secondary_contact_name || '',
      data.secondary_contact_phone || '', data.insurance_provider || '',
      data.insurance_policy_number || '', data.insurance_group_number || '',
      data.primary_doctor || '', data.primary_doctor_phone || '',
      data.organ_donor || 0, data.notes || ''
    );
    return this.stmts.getById.get(id, userId);
  }

  findById(id, userId) {
    return this.stmts.getById.get(id, userId);
  }

  findAll(userId) {
    return this.db.prepare('SELECT * FROM emergency_cards WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  }

  findByFamilyMember(userId, familyMemberId) {
    return this.stmts.findByFamilyMember.get(userId, familyMemberId);
  }

  update(id, userId, data) {
    const fields = [];
    const values = [];

    for (const key of ['family_member_id', 'blood_type', 'allergies', 'chronic_conditions',
      'current_medications', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relation', 'secondary_contact_name', 'secondary_contact_phone',
      'insurance_provider', 'insurance_policy_number', 'insurance_group_number',
      'primary_doctor', 'primary_doctor_phone', 'organ_donor', 'notes']) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }

    if (fields.length) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, userId);
      this.db.prepare(`UPDATE emergency_cards SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values);
    }

    return this.stmts.getById.get(id, userId);
  }

  delete(id, userId) {
    return this.stmts.delete.run(id, userId);
  }

  /**
   * Get a shareable emergency card (no user_id check — for sharing via token).
   */
  findByIdPublic(id) {
    return this.db.prepare(`
      SELECT ec.*, fm.name as family_member_name
      FROM emergency_cards ec
      LEFT JOIN family_members fm ON fm.id = ec.family_member_id
      WHERE ec.id = ?
    `).get(id);
  }
}

module.exports = EmergencyCardRepo;
