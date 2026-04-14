const { tmpdir } = require('os');
const { mkdtempSync, rmSync } = require('fs');
const path = require('path');
const request = require('supertest');
const crypto = require('crypto');

let _app, _db, _dir, _testSessionId, _testUserId;

function setup() {
  if (!_app) {
    process.env.NODE_ENV = 'test';
    _dir = mkdtempSync(path.join(tmpdir(), 'healthflow-test-'));
    process.env.DB_DIR = _dir;
    process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
    process.env.PORT = '3461';
    _app = require('../src/server');
    const initDb = require('../src/db');
    const { db } = initDb(_dir);
    _db = db;
    _ensureTestAuth();
  }
  return { app: _app, db: _db, dir: _dir };
}

function _ensureTestAuth() {
  _testUserId = 1;
  const bcrypt = require('bcryptjs');
  const user = _db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (!user) {
    const hash = bcrypt.hashSync('testpassword', 4);
    _db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?,?,?)').run(
      'test@test.com', hash, 'Test User'
    );
  } else {
    const hash = bcrypt.hashSync('testpassword', 4);
    _db.prepare('UPDATE users SET password_hash=? WHERE id=1').run(hash);
  }
  _testSessionId = 'test-session-' + crypto.randomUUID();
  _db.prepare(
    "INSERT OR REPLACE INTO sessions (sid, user_id, remember, expires_at) VALUES (?, ?, 1, datetime('now', '+1 day'))"
  ).run(_testSessionId, _testUserId);
}

function cleanDb() {
  const { db } = setup();
  try { db.exec('DELETE FROM medical_expenses'); } catch {}
  try { db.exec('DELETE FROM medical_documents'); } catch {}
  try { db.exec('DELETE FROM health_conditions'); } catch {}
  try { db.exec('DELETE FROM allergies'); } catch {}
  try { db.exec('DELETE FROM first_aid_items'); } catch {}
  try { db.exec('DELETE FROM vitals'); } catch {}
  try { db.exec('DELETE FROM medications'); } catch {}
  try { db.exec('DELETE FROM appointments'); } catch {}
  try { db.exec('DELETE FROM emergency_cards'); } catch {}
  try { db.exec('DELETE FROM family_members'); } catch {}
  try { db.exec('DELETE FROM login_attempts'); } catch {}
  try { db.exec('DELETE FROM sessions WHERE sid != ?', _testSessionId); } catch {}
}

function teardown() {
  if (_db) { try { _db.close(); } catch {} }
  if (_dir) { try { rmSync(_dir, { recursive: true, force: true }); } catch {} }
}

function agent() {
  const { app } = setup();
  return request.agent(app).set('Cookie', `hf_sid=${_testSessionId}`);
}

function rawAgent() {
  const { app } = setup();
  return request(app);
}

function makeUser(overrides = {}) {
  const { db } = setup();
  const bcrypt = require('bcryptjs');
  const o = { email: 'new@test.com', password: 'Password123', display_name: 'New User', ...overrides };
  const hash = bcrypt.hashSync(o.password, 4);
  const r = db.prepare('INSERT INTO users (email, password_hash, display_name) VALUES (?,?,?)').run(
    o.email, hash, o.display_name
  );
  return db.prepare('SELECT id, email, display_name, created_at FROM users WHERE id=?').get(r.lastInsertRowid);
}

function makeFamilyMember(overrides = {}) {
  const { db } = setup();
  // Ensure the user exists for foreign key constraint
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    name: 'Test Family Member',
    relation: 'child',
    date_of_birth: '2010-01-15',
    gender: 'male',
    blood_type: 'A+',
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO family_members (id, user_id, name, relation, date_of_birth, gender, blood_type, notes)
    VALUES (?,?,?,?,?,?,?,?)`).run(o.id, o.user_id, o.name, o.relation, o.date_of_birth, o.gender, o.blood_type, o.notes);
  return db.prepare('SELECT * FROM family_members WHERE id=?').get(o.id);
}

function makeVital(overrides = {}) {
  const { db } = setup();
  // Ensure the user exists for foreign key constraint
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    type: 'blood_pressure',
    value: 120,
    value_secondary: 80,
    unit: 'mmHg',
    measured_at: new Date().toISOString(),
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO vitals (id, user_id, family_member_id, type, value, value_secondary, unit, measured_at, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.type, o.value, o.value_secondary, o.unit, o.measured_at, o.notes
  );
  return db.prepare('SELECT * FROM vitals WHERE id=?').get(o.id);
}

function makeMedication(overrides = {}) {
  const { db } = setup();
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    name: 'Test Medication',
    dosage: '500mg',
    frequency: 'daily',
    schedule_times: '08:00,20:00',
    start_date: '2026-04-01',
    end_date: null,
    prescribing_doctor: 'Dr. Smith',
    pharmacy: 'Test Pharmacy',
    refill_date: '2026-05-01',
    refill_quantity: 30,
    remaining_quantity: 15,
    is_active: 1,
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO medications (id, user_id, family_member_id, name, dosage, frequency, schedule_times,
    start_date, end_date, prescribing_doctor, pharmacy, refill_date, refill_quantity, remaining_quantity, is_active, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.name, o.dosage, o.frequency, o.schedule_times,
    o.start_date, o.end_date, o.prescribing_doctor, o.pharmacy, o.refill_date,
    o.refill_quantity, o.remaining_quantity, o.is_active, o.notes
  );
  return db.prepare('SELECT * FROM medications WHERE id=?').get(o.id);
}

function makeAppointment(overrides = {}) {
  const { db } = setup();
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    doctor_name: 'Dr. Johnson',
    hospital: 'Test Hospital',
    type: 'checkup',
    appointment_date: '2026-04-20',
    appointment_time: '10:00',
    duration_minutes: 30,
    location: 'Building A, Room 101',
    notes: '',
    status: 'scheduled',
    post_visit_notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO appointments (id, user_id, family_member_id, doctor_name, hospital, type, appointment_date,
    appointment_time, duration_minutes, location, notes, status, post_visit_notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.doctor_name, o.hospital, o.type, o.appointment_date,
    o.appointment_time, o.duration_minutes, o.location, o.notes, o.status, o.post_visit_notes
  );
  return db.prepare('SELECT * FROM appointments WHERE id=?').get(o.id);
}

function makeEmergencyCard(overrides = {}) {
  const { db } = setup();
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    blood_type: 'O+',
    allergies: 'Penicillin',
    chronic_conditions: 'Diabetes',
    current_medications: 'Insulin',
    emergency_contact_name: 'Jane Doe',
    emergency_contact_phone: '+1234567890',
    emergency_contact_relation: 'Spouse',
    secondary_contact_name: '',
    secondary_contact_phone: '',
    insurance_provider: 'Test Insurance',
    insurance_policy_number: 'POL123456',
    insurance_group_number: 'GRP789',
    primary_doctor: 'Dr. Brown',
    primary_doctor_phone: '+1987654321',
    organ_donor: 1,
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO emergency_cards (id, user_id, family_member_id, blood_type, allergies, chronic_conditions,
    current_medications, emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
    secondary_contact_name, secondary_contact_phone, insurance_provider, insurance_policy_number,
    insurance_group_number, primary_doctor, primary_doctor_phone, organ_donor, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.blood_type, o.allergies, o.chronic_conditions,
    o.current_medications, o.emergency_contact_name, o.emergency_contact_phone, o.emergency_contact_relation,
    o.secondary_contact_name, o.secondary_contact_phone, o.insurance_provider, o.insurance_policy_number,
    o.insurance_group_number, o.primary_doctor, o.primary_doctor_phone, o.organ_donor, o.notes
  );
  return db.prepare('SELECT * FROM emergency_cards WHERE id=?').get(o.id);
}

function makeCondition(overrides = {}) {
  const { db } = setup();
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    name: 'Test Condition',
    severity: 'moderate',
    diagnosed_date: '2024-01-15',
    diagnosing_doctor: 'Dr. Test',
    status: 'active',
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO health_conditions (id, user_id, family_member_id, name, severity, diagnosed_date, diagnosing_doctor, status, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.name, o.severity, o.diagnosed_date, o.diagnosing_doctor, o.status, o.notes
  );
  return db.prepare('SELECT * FROM health_conditions WHERE id=?').get(o.id);
}

function makeAllergy(overrides = {}) {
  const { db } = setup();
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    allergen: 'Test Allergen',
    category: 'other',
    severity: 'moderate',
    reaction: '',
    diagnosed_date: null,
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO allergies (id, user_id, family_member_id, allergen, category, severity, reaction, diagnosed_date, notes)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.allergen, o.category, o.severity, o.reaction, o.diagnosed_date, o.notes
  );
  return db.prepare('SELECT * FROM allergies WHERE id=?').get(o.id);
}

function makeMedicalExpense(overrides = {}) {
  const { db } = setup();
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    appointment_id: null,
    category: 'consultation',
    description: 'Test expense',
    amount: 100000,
    currency: 'INR',
    expense_date: '2026-04-10',
    payment_method: '',
    insurance_claimed: 0,
    receipt_document_id: null,
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO medical_expenses (id, user_id, family_member_id, appointment_id, category, description, amount, currency, expense_date, payment_method, insurance_claimed, receipt_document_id, notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.appointment_id, o.category, o.description, o.amount, o.currency, o.expense_date, o.payment_method, o.insurance_claimed, o.receipt_document_id, o.notes
  );
  return db.prepare('SELECT * FROM medical_expenses WHERE id=?').get(o.id);
}

function makeFirstAidItem(overrides = {}) {
  const { db } = setup();
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    name: 'Test First Aid Item',
    category: 'general',
    quantity: 1,
    expiry_date: null,
    is_available: 1,
    notes: '',
    ...overrides
  };
  db.prepare(`INSERT INTO first_aid_items (id, user_id, name, category, quantity, expiry_date, is_available, notes)
    VALUES (?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.name, o.category, o.quantity, o.expiry_date, o.is_available, o.notes
  );
  return db.prepare('SELECT * FROM first_aid_items WHERE id=?').get(o.id);
}

function makeDocument(overrides = {}) {
  const { db } = setup();
  if (overrides.user_id && overrides.user_id !== _testUserId) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(overrides.user_id);
    if (!userExists) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync('testpassword', 4);
      db.prepare('INSERT OR IGNORE INTO users (id, email, password_hash, display_name) VALUES (?,?,?,?)').run(
        overrides.user_id, `user${overrides.user_id}@test.com`, hash, `User ${overrides.user_id}`
      );
    }
  }
  const o = {
    id: crypto.randomUUID(),
    user_id: _testUserId,
    family_member_id: null,
    appointment_id: null,
    type: 'prescription',
    title: 'Test Document',
    file_name: 'test.pdf',
    file_path: '/uploads/test.pdf',
    file_size: 1024,
    mime_type: 'application/pdf',
    notes: '',
    document_date: null,
    doctor_name: '',
    hospital: '',
    ...overrides
  };
  db.prepare(`INSERT INTO medical_documents (id, user_id, family_member_id, appointment_id, type, title, file_name, file_path, file_size, mime_type, notes, document_date, doctor_name, hospital)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    o.id, o.user_id, o.family_member_id, o.appointment_id, o.type, o.title, o.file_name, o.file_path, o.file_size, o.mime_type, o.notes, o.document_date, o.doctor_name, o.hospital
  );
  return db.prepare('SELECT * FROM medical_documents WHERE id=?').get(o.id);
}

module.exports = {
  setup,
  cleanDb,
  teardown,
  agent,
  rawAgent,
  makeUser,
  makeFamilyMember,
  makeVital,
  makeMedication,
  makeAppointment,
  makeEmergencyCard,
  makeCondition,
  makeAllergy,
  makeMedicalExpense,
  makeFirstAidItem,
  makeDocument,
};
