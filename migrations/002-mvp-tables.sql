-- HealthFlow v0.2.0 — MVP Tables
-- Adds: health_conditions, allergies, medical_documents, medical_expenses, first_aid_items
-- Alters: family_members (height/weight), appointments (reminder/recurrence)

-- ─── Health Conditions ───
CREATE TABLE IF NOT EXISTS health_conditions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  severity TEXT DEFAULT 'moderate' CHECK(severity IN ('mild', 'moderate', 'severe', 'in_remission')),
  diagnosed_date TEXT,
  diagnosing_doctor TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'managed', 'resolved', 'monitoring')),
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_health_conditions_user ON health_conditions(user_id);
CREATE INDEX IF NOT EXISTS idx_health_conditions_family ON health_conditions(family_member_id);
CREATE INDEX IF NOT EXISTS idx_health_conditions_status ON health_conditions(user_id, status);

-- ─── Allergies ───
CREATE TABLE IF NOT EXISTS allergies (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  allergen TEXT NOT NULL,
  category TEXT DEFAULT 'other' CHECK(category IN ('drug', 'food', 'environmental', 'insect', 'latex', 'other')),
  severity TEXT DEFAULT 'moderate' CHECK(severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  reaction TEXT DEFAULT '',
  diagnosed_date TEXT,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_allergies_user ON allergies(user_id);
CREATE INDEX IF NOT EXISTS idx_allergies_family ON allergies(family_member_id);

-- ─── Medical Documents ───
CREATE TABLE IF NOT EXISTS medical_documents (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('prescription', 'lab_report', 'insurance_card', 'vaccination_record', 'discharge_summary', 'imaging', 'receipt', 'other')),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  notes TEXT DEFAULT '',
  document_date TEXT,
  doctor_name TEXT DEFAULT '',
  hospital TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medical_documents_user ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_family ON medical_documents(family_member_id);
CREATE INDEX IF NOT EXISTS idx_medical_documents_type ON medical_documents(user_id, type);
CREATE INDEX IF NOT EXISTS idx_medical_documents_appointment ON medical_documents(appointment_id);

-- ─── Medical Expenses ───
CREATE TABLE IF NOT EXISTS medical_expenses (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  appointment_id TEXT REFERENCES appointments(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'consultation' CHECK(category IN (
    'consultation', 'medication', 'lab_test', 'procedure', 'hospitalization',
    'dental', 'optical', 'therapy', 'insurance_premium', 'other')),
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  expense_date TEXT NOT NULL,
  payment_method TEXT DEFAULT '' CHECK(payment_method IN ('', 'cash', 'card', 'upi', 'insurance', 'other')),
  insurance_claimed INTEGER DEFAULT 0,
  receipt_document_id TEXT REFERENCES medical_documents(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medical_expenses_user ON medical_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_expenses_date ON medical_expenses(user_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_medical_expenses_family ON medical_expenses(family_member_id);
CREATE INDEX IF NOT EXISTS idx_medical_expenses_category ON medical_expenses(user_id, category);

-- ─── First Aid Items ───
CREATE TABLE IF NOT EXISTS first_aid_items (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK(category IN (
    'general', 'wound_care', 'medication', 'tool', 'ppe', 'other')),
  quantity INTEGER DEFAULT 1,
  expiry_date TEXT,
  is_available INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_first_aid_items_user ON first_aid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_first_aid_items_expiry ON first_aid_items(user_id, expiry_date);

-- ─── Alter family_members ───
ALTER TABLE family_members ADD COLUMN height_cm REAL;
ALTER TABLE family_members ADD COLUMN weight_kg REAL;

-- ─── Alter appointments ───
ALTER TABLE appointments ADD COLUMN reminder_minutes INTEGER;
ALTER TABLE appointments ADD COLUMN recurrence TEXT DEFAULT '' CHECK(recurrence IN ('', 'weekly', 'monthly', 'quarterly', 'annually'));
