-- 0006: Payroll & salary extensions
-- Incentive/bonus/arrears adjustments, structured loan recovery,
-- full & final settlement, and salary revision history.

ALTER TABLE payroll_items ADD COLUMN incentive REAL NOT NULL DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN bonus REAL NOT NULL DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN arrears REAL NOT NULL DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN loan_deduction REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS employee_loans (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id  INTEGER NOT NULL,
  principal    REAL NOT NULL,
  emi_amount   REAL NOT NULL,
  outstanding  REAL NOT NULL,
  start_month  INTEGER NOT NULL,
  start_year   INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active',
  remarks      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_loans_employee ON employee_loans(employee_id);

CREATE TABLE IF NOT EXISTS settlements (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id        INTEGER NOT NULL,
  exit_date          TEXT NOT NULL,
  unpaid_days        REAL NOT NULL DEFAULT 0,
  unpaid_amount      REAL NOT NULL DEFAULT 0,
  encash_days        REAL NOT NULL DEFAULT 0,
  encashment_amount  REAL NOT NULL DEFAULT 0,
  notice_recovery    REAL NOT NULL DEFAULT 0,
  other_recovery     REAL NOT NULL DEFAULT 0,
  loan_outstanding   REAL NOT NULL DEFAULT 0,
  net_payable        REAL NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'prepared',
  remarks            TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at            TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS salary_revisions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id    INTEGER NOT NULL,
  effective_from TEXT NOT NULL,
  reason         TEXT,
  old_basic      REAL,
  new_basic      REAL,
  old_gross      REAL,
  new_gross      REAL,
  designation    TEXT,
  remarks        TEXT,
  created_by     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
