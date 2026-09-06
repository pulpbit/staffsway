-- 0018: Employee Registration master — spec-driven fields
-- Append-only; all new columns nullable/defaulted, safe on existing data.

-- Basic details
ALTER TABLE employees ADD COLUMN spouse_name TEXT;
ALTER TABLE employees ADD COLUMN marital_status TEXT;
ALTER TABLE employees ADD COLUMN nationality TEXT NOT NULL DEFAULT 'Indian';

-- Contact details
ALTER TABLE employees ADD COLUMN alternate_mobile TEXT;
ALTER TABLE employees ADD COLUMN permanent_same_as_present INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN permanent_address TEXT;
ALTER TABLE employees ADD COLUMN permanent_city TEXT;
ALTER TABLE employees ADD COLUMN permanent_state TEXT;
ALTER TABLE employees ADD COLUMN permanent_pincode TEXT;

-- Official information
ALTER TABLE employees ADD COLUMN working_days_week INTEGER NOT NULL DEFAULT 6;
ALTER TABLE employees ADD COLUMN notice_period_days INTEGER;

-- Salary & payroll
ALTER TABLE employees ADD COLUMN ctc REAL;
ALTER TABLE employees ADD COLUMN esi_number TEXT;

-- Bank details
ALTER TABLE employees ADD COLUMN bank_holder_name TEXT;

-- Emergency contact
ALTER TABLE employees ADD COLUMN emergency_contact_relation TEXT;

-- Nominee details
CREATE TABLE IF NOT EXISTS employee_nominees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   INTEGER NOT NULL,
  name          TEXT NOT NULL,
  relation      TEXT,
  share         REAL NOT NULL DEFAULT 0,
  contact       TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emp_nominees_employee ON employee_nominees(employee_id);