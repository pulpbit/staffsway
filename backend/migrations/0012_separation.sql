-- Migration 0012: Separation / Exit Management
-- Resignation, Notice Period, Approval, Exit Interview,
-- Asset Return, Clearance, No-Dues, Letters, Exit History

CREATE TABLE IF NOT EXISTS separations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  separation_type TEXT NOT NULL DEFAULT 'resignation',
  resignation_date TEXT NOT NULL,
  last_working_date TEXT,
  notice_period_days INTEGER NOT NULL DEFAULT 30,
  notice_served_days INTEGER NOT NULL DEFAULT 0,
  notice_buyout   INTEGER NOT NULL DEFAULT 0,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  approved_by     TEXT,
  approved_at     TEXT,
  rejection_reason TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exit_interviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  separation_id   INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  reason_for_leaving TEXT,
  job_satisfaction INTEGER,
  work_environment INTEGER,
  management_rating INTEGER,
  growth_opportunity INTEGER,
  would_recommend  INTEGER,
  feedback_text   TEXT,
  suggestions     TEXT,
  conducted_by    TEXT,
  conducted_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (separation_id) REFERENCES separations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS clearance_checklist (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  separation_id   INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  item_name       TEXT NOT NULL,
  item_category   TEXT NOT NULL DEFAULT 'general',
  is_cleared      INTEGER NOT NULL DEFAULT 0,
  cleared_by      TEXT,
  cleared_at      TEXT,
  remarks         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (separation_id) REFERENCES separations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS asset_returns (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  separation_id   INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  asset_id        INTEGER,
  asset_description TEXT NOT NULL,
  returned        INTEGER NOT NULL DEFAULT 0,
  returned_date   TEXT,
  condition_notes TEXT,
  received_by     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (separation_id) REFERENCES separations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS no_dues (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  separation_id   INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  department      TEXT NOT NULL,
  amount          REAL NOT NULL DEFAULT 0,
  is_cleared      INTEGER NOT NULL DEFAULT 0,
  remarks         TEXT,
  cleared_by      TEXT,
  cleared_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (separation_id) REFERENCES separations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exit_letters (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  separation_id   INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  letter_type     TEXT NOT NULL,
  letter_date     TEXT NOT NULL,
  issued_by       TEXT,
  letter_body     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (separation_id) REFERENCES separations(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sep_employee ON separations(employee_id);
CREATE INDEX IF NOT EXISTS idx_sep_status ON separations(status);
CREATE INDEX IF NOT EXISTS idx_exit_int_sep ON exit_interviews(separation_id);
CREATE INDEX IF NOT EXISTS idx_clearance_sep ON clearance_checklist(separation_id);
CREATE INDEX IF NOT EXISTS idx_asset_ret_sep ON asset_returns(separation_id);
CREATE INDEX IF NOT EXISTS idx_nodues_sep ON no_dues(separation_id);
CREATE INDEX IF NOT EXISTS idx_exit_letters_sep ON exit_letters(separation_id);
