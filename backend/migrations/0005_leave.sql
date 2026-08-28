-- Leave Management (append-only).
-- leave_types gains quota/accrual config; balances are derived (approved requests
-- vs entitlement) except manual comp-off credits and encashment days, which live
-- in leave_balances. Holidays feed the working-day calculation for requests.
ALTER TABLE leave_types ADD COLUMN annual_quota REAL NOT NULL DEFAULT 0;
ALTER TABLE leave_types ADD COLUMN accrual_monthly INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leave_types ADD COLUMN is_comp_off INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS holidays (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id  INTEGER REFERENCES leave_types(id) ON DELETE SET NULL,
  start_date     TEXT NOT NULL,
  end_date       TEXT NOT NULL,
  days           REAL NOT NULL,
  reason         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending_manager',
  manager_status TEXT NOT NULL DEFAULT 'pending',
  manager_by     TEXT,
  manager_at     TEXT,
  manager_remarks TEXT,
  hr_status      TEXT NOT NULL DEFAULT 'pending',
  hr_by          TEXT,
  hr_at          TEXT,
  hr_remarks     TEXT,
  created_by     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

-- Only manual adjustments are stored; entitled/accrued derive from leave_types,
-- used/pending derive from leave_requests.
CREATE TABLE IF NOT EXISTS leave_balances (
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  comp_off_extra REAL NOT NULL DEFAULT 0,
  encashed      REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_encashments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER REFERENCES leave_types(id) ON DELETE SET NULL,
  year          INTEGER NOT NULL,
  days          REAL NOT NULL,
  amount        REAL NOT NULL,
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
