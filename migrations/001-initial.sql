-- HealthFlow Initial Schema
-- All PKs: UUID v4 text. All timestamps: ISO 8601 UTC.

CREATE TABLE IF NOT EXISTS family_members (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT DEFAULT 'self' CHECK(relation IN ('self', 'spouse', 'child', 'parent', 'sibling', 'grandparent', 'other')),
  date_of_birth TEXT,
  gender TEXT CHECK(gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_type TEXT CHECK(blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

CREATE TABLE IF NOT EXISTS vitals (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('blood_pressure', 'blood_sugar', 'weight', 'temperature', 'spo2', 'heart_rate', 'bmi')),
  value REAL NOT NULL,
  value_secondary REAL,
  unit TEXT DEFAULT '',
  measured_at TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_vitals_user ON vitals(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_type ON vitals(user_id, type);
CREATE INDEX IF NOT EXISTS idx_vitals_measured ON vitals(user_id, measured_at);
CREATE INDEX IF NOT EXISTS idx_vitals_family ON vitals(family_member_id);

CREATE TABLE IF NOT EXISTS medications (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  dosage TEXT DEFAULT '',
  frequency TEXT DEFAULT 'daily' CHECK(frequency IN ('daily', 'twice_daily', 'thrice_daily', 'weekly', 'monthly', 'as_needed', 'custom')),
  schedule_times TEXT DEFAULT '',
  start_date TEXT,
  end_date TEXT,
  prescribing_doctor TEXT DEFAULT '',
  pharmacy TEXT DEFAULT '',
  refill_date TEXT,
  refill_quantity INTEGER,
  remaining_quantity INTEGER,
  is_active INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medications_family ON medications(family_member_id);
CREATE INDEX IF NOT EXISTS idx_medications_refill ON medications(user_id, refill_date);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  doctor_name TEXT NOT NULL,
  hospital TEXT DEFAULT '',
  type TEXT DEFAULT 'checkup' CHECK(type IN ('checkup', 'follow_up', 'specialist', 'lab_test', 'vaccination', 'dental', 'eye', 'emergency', 'other')),
  appointment_date TEXT NOT NULL,
  appointment_time TEXT,
  duration_minutes INTEGER,
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  post_visit_notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(user_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_family ON appointments(family_member_id);

CREATE TABLE IF NOT EXISTS emergency_cards (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_member_id TEXT REFERENCES family_members(id) ON DELETE SET NULL,
  blood_type TEXT DEFAULT 'unknown' CHECK(blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  allergies TEXT DEFAULT '',
  chronic_conditions TEXT DEFAULT '',
  current_medications TEXT DEFAULT '',
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  emergency_contact_relation TEXT DEFAULT '',
  secondary_contact_name TEXT DEFAULT '',
  secondary_contact_phone TEXT DEFAULT '',
  insurance_provider TEXT DEFAULT '',
  insurance_policy_number TEXT DEFAULT '',
  insurance_group_number TEXT DEFAULT '',
  primary_doctor TEXT DEFAULT '',
  primary_doctor_phone TEXT DEFAULT '',
  organ_donor INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emergency_cards_user ON emergency_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_cards_family ON emergency_cards(family_member_id);
