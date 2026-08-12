-- Staffsway HRMS — initial schema
-- Cloudflare D1 (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name              TEXT NOT NULL DEFAULT 'Prime Workforce Solutions',
  company_tagline           TEXT NOT NULL DEFAULT 'Manpower Staffing & HR Services',
  address                   TEXT,
  city                      TEXT,
  state                     TEXT,
  pincode                   TEXT,
  phone                     TEXT,
  email                     TEXT,
  website                   TEXT,
  gstin                     TEXT,
  pan                       TEXT,
  cin                       TEXT,
  currency                  TEXT NOT NULL DEFAULT 'INR',
  financial_year_start      INTEGER NOT NULL DEFAULT 4,
  salary_basis_days         INTEGER NOT NULL DEFAULT 26,
  pf_rate                   REAL NOT NULL DEFAULT 12,
  pf_cap                    REAL NOT NULL DEFAULT 1800,
  pf_eligibility            REAL NOT NULL DEFAULT 15000,
  esic_rate                 REAL NOT NULL DEFAULT 0.75,
  esic_eligibility          REAL NOT NULL DEFAULT 21000,
  professional_tax_amount   REAL NOT NULL DEFAULT 200,
  professional_tax_min_gross REAL NOT NULL DEFAULT 10000,
  default_ot_rate           REAL NOT NULL DEFAULT 80,
  attendance_lock_enabled   INTEGER NOT NULL DEFAULT 1,
  created_at                TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  contact_person TEXT,
  phone         TEXT,
  email         TEXT,
  address       TEXT,
  contract_start TEXT,
  contract_end  TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sites (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      INTEGER NOT NULL,
  name           TEXT NOT NULL,
  location       TEXT,
  supervisor_name TEXT,
  shift_type     TEXT,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sites_client ON sites(client_id);

CREATE TABLE IF NOT EXISTS employees (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code  TEXT NOT NULL UNIQUE,
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  gender         TEXT,
  dob            TEXT,
  mobile         TEXT,
  email          TEXT,
  address        TEXT,
  city           TEXT,
  state          TEXT,
  pincode        TEXT,
  bank_name      TEXT,
  bank_account   TEXT,
  bank_ifsc      TEXT,
  pan            TEXT,
  uan            TEXT,
  joining_date   TEXT,
  designation    TEXT,
  department     TEXT,
  employee_type  TEXT NOT NULL DEFAULT 'permanent',
  shift_type     TEXT,
  site_id        INTEGER,
  status         TEXT NOT NULL DEFAULT 'active',
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_employees_site ON employees(site_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_designation ON employees(designation);

CREATE TABLE IF NOT EXISTS employee_documents (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  document_type   TEXT NOT NULL,
  document_name   TEXT,
  document_number TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emp_docs_employee ON employee_documents(employee_id);

CREATE TABLE IF NOT EXISTS salary_structures (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  effective_from  TEXT NOT NULL,
  basic           REAL NOT NULL DEFAULT 0,
  hra             REAL NOT NULL DEFAULT 0,
  conveyance      REAL NOT NULL DEFAULT 0,
  other_allowance REAL NOT NULL DEFAULT 0,
  overtime_rate   REAL NOT NULL DEFAULT 0,
  pf_applicable   INTEGER NOT NULL DEFAULT 1,
  esic_applicable INTEGER NOT NULL DEFAULT 1,
  other_deduction REAL NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_salary_emp ON salary_structures(employee_id);

CREATE TABLE IF NOT EXISTS attendance_monthly (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id   INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  year          INTEGER NOT NULL,
  present_days  INTEGER NOT NULL DEFAULT 0,
  absent_days   INTEGER NOT NULL DEFAULT 0,
  paid_leave    INTEGER NOT NULL DEFAULT 0,
  unpaid_leave  INTEGER NOT NULL DEFAULT 0,
  ot_hours      REAL NOT NULL DEFAULT 0,
  remarks       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE (employee_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_attendance_month ON attendance_monthly(month, year);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance_monthly(employee_id);

CREATE TABLE IF NOT EXISTS payroll (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  month           INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  total_employees INTEGER NOT NULL DEFAULT 0,
  gross_total     REAL NOT NULL DEFAULT 0,
  deduction_total REAL NOT NULL DEFAULT 0,
  net_total       REAL NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  finalized_at    TEXT,
  paid_at         TEXT,
  UNIQUE (month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_month ON payroll(month, year);

CREATE TABLE IF NOT EXISTS payroll_items (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_id           INTEGER NOT NULL,
  employee_id          INTEGER NOT NULL,
  attendance_id        INTEGER,
  present_days         INTEGER NOT NULL DEFAULT 0,
  absent_days          INTEGER NOT NULL DEFAULT 0,
  paid_leave           INTEGER NOT NULL DEFAULT 0,
  unpaid_leave         INTEGER NOT NULL DEFAULT 0,
  ot_hours             REAL NOT NULL DEFAULT 0,
  basic                REAL NOT NULL DEFAULT 0,
  hra                  REAL NOT NULL DEFAULT 0,
  conveyance           REAL NOT NULL DEFAULT 0,
  other_allowance      REAL NOT NULL DEFAULT 0,
  overtime_earnings    REAL NOT NULL DEFAULT 0,
  attendance_deduction REAL NOT NULL DEFAULT 0,
  gross                REAL NOT NULL DEFAULT 0,
  pf                   REAL NOT NULL DEFAULT 0,
  esic                 REAL NOT NULL DEFAULT 0,
  professional_tax     REAL NOT NULL DEFAULT 0,
  advance_deduction    REAL NOT NULL DEFAULT 0,
  other_deduction      REAL NOT NULL DEFAULT 0,
  total_deductions     REAL NOT NULL DEFAULT 0,
  net_salary           REAL NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft',
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (payroll_id) REFERENCES payroll(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee ON payroll_items(employee_id);

CREATE TABLE IF NOT EXISTS salary_slips (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_item_id INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  slip_number     TEXT NOT NULL,
  month           INTEGER NOT NULL,
  year            INTEGER NOT NULL,
  generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (payroll_item_id) REFERENCES payroll_items(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE (payroll_item_id)
);

CREATE INDEX IF NOT EXISTS idx_slips_employee ON salary_slips(employee_id);
CREATE INDEX IF NOT EXISTS idx_slips_month ON salary_slips(month, year);

CREATE TABLE IF NOT EXISTS advances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  amount      REAL NOT NULL DEFAULT 0,
  month       INTEGER NOT NULL,
  year        INTEGER NOT NULL,
  remarks     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_advances_emp ON advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_advances_month ON advances(month, year);

CREATE TABLE IF NOT EXISTS leave_types (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  paid_default INTEGER NOT NULL DEFAULT 1,
  max_days    INTEGER,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shift_types (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  start_time TEXT,
  end_time   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
