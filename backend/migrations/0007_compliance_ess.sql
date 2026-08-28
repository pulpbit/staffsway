-- 0007: Statutory compliance + Employee Self Service
-- Item 6: statutory config extensions, minimum wages, compliance calendar records
-- Item 7: employee portal accounts, regularization requests, HR requests

-- ---------- Statutory compliance ----------
ALTER TABLE settings ADD COLUMN state_name TEXT NOT NULL DEFAULT 'Haryana';
ALTER TABLE settings ADD COLUMN bonus_percent REAL NOT NULL DEFAULT 8.33;
ALTER TABLE settings ADD COLUMN bonus_max_percent REAL NOT NULL DEFAULT 20;
ALTER TABLE settings ADD COLUMN bonus_wage_ceiling REAL NOT NULL DEFAULT 21000;

CREATE TABLE IF NOT EXISTS minimum_wages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  state          TEXT NOT NULL,
  category       TEXT NOT NULL,
  basic_monthly  REAL NOT NULL,
  va_monthly     REAL NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL,
  UNIQUE (state, category)
);

ALTER TABLE employees ADD COLUMN skill_category TEXT;

CREATE TABLE IF NOT EXISTS compliance_records (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  obligation TEXT NOT NULL,
  year       INTEGER NOT NULL,
  month      INTEGER,
  due_date   TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  remarks    TEXT,
  done_by    TEXT,
  done_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (obligation, year, month)
);

-- ---------- Employee Self Service ----------
ALTER TABLE users ADD COLUMN employee_id INTEGER REFERENCES employees(id);

CREATE TABLE IF NOT EXISTS attendance_regularizations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL,
  month        INTEGER NOT NULL,
  year         INTEGER NOT NULL,
  present_days REAL NOT NULL DEFAULT 0,
  absent_days  REAL NOT NULL DEFAULT 0,
  paid_leave   REAL NOT NULL DEFAULT 0,
  unpaid_leave REAL NOT NULL DEFAULT 0,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  reviewed_by  TEXT,
  reviewed_at  TEXT,
  reply        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hr_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  reply       TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
