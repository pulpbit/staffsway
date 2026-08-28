-- Migration 0011: Training Management
-- Training Calendar, Assignments, Attendance, Materials,
-- Certifications, Skill Matrix, Feedback, History

CREATE TABLE IF NOT EXISTS trainings (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT NOT NULL,
  description     TEXT,
  training_type   TEXT NOT NULL DEFAULT 'technical',
  trainer_name    TEXT,
  trainer_org     TEXT,
  mode            TEXT NOT NULL DEFAULT 'in_person',
  location        TEXT,
  start_date      TEXT NOT NULL,
  end_date        TEXT,
  start_time      TEXT,
  end_time        TEXT,
  duration_hours  REAL,
  max_participants INTEGER,
  status          TEXT NOT NULL DEFAULT 'scheduled',
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS training_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id     INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'assigned',
  assigned_by     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(training_id, employee_id)
);

CREATE TABLE IF NOT EXISTS training_attendance (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id     INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  attended        INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  marked_by       TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(training_id, employee_id)
);

CREATE TABLE IF NOT EXISTS training_materials (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  material_type   TEXT NOT NULL DEFAULT 'document',
  url             TEXT,
  uploaded_by     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS certifications (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  name            TEXT NOT NULL,
  issuing_org     TEXT,
  issue_date      TEXT,
  expiry_date     TEXT,
  credential_id   TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_matrix (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  skill_name      TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'technical',
  proficiency     TEXT NOT NULL DEFAULT 'beginner',
  last_assessed   TEXT,
  assessed_by     TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_feedback (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id     INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  rating          INTEGER,
  content_rating  INTEGER,
  trainer_rating  INTEGER,
  comments        TEXT,
  suggestions     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE(training_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_status ON trainings(status);
CREATE INDEX IF NOT EXISTS idx_training_start ON trainings(start_date);
CREATE INDEX IF NOT EXISTS idx_train_assign_training ON training_assignments(training_id);
CREATE INDEX IF NOT EXISTS idx_train_assign_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_train_attend_training ON training_attendance(training_id);
CREATE INDEX IF NOT EXISTS idx_cert_employee ON certifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_employee ON skill_matrix(employee_id);
CREATE INDEX IF NOT EXISTS idx_skill_name ON skill_matrix(skill_name);
CREATE INDEX IF NOT EXISTS idx_train_feedback_training ON training_feedback(training_id);
