-- 1. Exit date becomes a real, user-entered column.
--    Previously "exit_date" was a derived expression
--    (COALESCE(approved separation last_working_date, deactivated_at)),
--    which made the deactivation date surface as the exit date.
--    Deactivation and exit are now two independent facts.
ALTER TABLE employees ADD COLUMN exit_date TEXT;
ALTER TABLE employees ADD COLUMN exit_reason TEXT;

-- 2. Collapse resigned/terminated into a single exit state; the former status
--    value is preserved as the exit reason.
UPDATE employees
SET exit_reason = status,
    exit_date = COALESCE(
      (SELECT COALESCE(sep.last_working_date, sep.resignation_date)
         FROM separations sep
        WHERE sep.employee_id = employees.id
          AND sep.status = 'approved'
        ORDER BY sep.id DESC
        LIMIT 1),
      deactivated_at,
      date('now')
    ),
    status = 'exited'
WHERE status IN ('resigned', 'terminated');

-- 3. attendance_daily must accept the X (not yet joined) mark. SQLite cannot
--    ALTER a CHECK constraint, so the table is rebuilt. Nothing references
--    attendance_daily, so dropping and recreating it is safe.
CREATE TABLE attendance_daily_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  mark       TEXT NOT NULL CHECK (mark IN ('P','A','R','HD','HF','L','X')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (employee_id, date)
);

INSERT INTO attendance_daily_new (id, employee_id, date, mark, created_at, updated_at)
SELECT id, employee_id, date, mark, created_at, updated_at FROM attendance_daily;

DROP TABLE attendance_daily;

ALTER TABLE attendance_daily_new RENAME TO attendance_daily;

CREATE INDEX IF NOT EXISTS idx_attd_date ON attendance_daily(date);
CREATE INDEX IF NOT EXISTS idx_attd_employee ON attendance_daily(employee_id);

-- 4. Transfer history. The transfer itself updates employees; this table is
--    the audit trail of who moved whom, where, when and why.
CREATE TABLE IF NOT EXISTS employee_transfers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id      INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  from_client_id   INTEGER,
  from_client_name TEXT,
  from_site_id     INTEGER,
  from_site_name   TEXT,
  to_client_id     INTEGER,
  to_client_name   TEXT,
  to_site_id       INTEGER,
  to_site_name     TEXT,
  from_designation TEXT,
  to_designation   TEXT,
  from_department  TEXT,
  to_department    TEXT,
  effective_date   TEXT NOT NULL,
  reason           TEXT,
  remarks          TEXT,
  transferred_by   TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emp_tr_employee ON employee_transfers(employee_id);
