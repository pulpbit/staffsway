-- Staffsway HRMS — per-employee statutory applicability
-- CRITICAL: PF/ESI/LWF/PT/TDS are configured PER EMPLOYEE.
-- Payroll must never assume universal applicability.

CREATE TABLE IF NOT EXISTS employee_statutory (
  employee_id    INTEGER PRIMARY KEY,
  pf_applicable  INTEGER NOT NULL DEFAULT 0,
  esi_applicable INTEGER NOT NULL DEFAULT 0,
  lwf_applicable INTEGER NOT NULL DEFAULT 0,
  pt_applicable  INTEGER NOT NULL DEFAULT 0,
  tds_applicable INTEGER NOT NULL DEFAULT 0,
  lwf_state      TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

-- Backfill from each employee's most recent salary structure so existing
-- demo data keeps behaving exactly as before (PF/ESI carried over;
-- LWF/TDS default OFF until configured).
INSERT OR IGNORE INTO employee_statutory (employee_id, pf_applicable, esi_applicable, lwf_applicable, pt_applicable, tds_applicable)
SELECT employee_id, pf_applicable, esic_applicable, 0, 1, 0
FROM salary_structures
WHERE id IN (SELECT MAX(id) FROM salary_structures GROUP BY employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_statutory_pf ON employee_statutory(pf_applicable);
CREATE INDEX IF NOT EXISTS idx_employee_statutory_esi ON employee_statutory(esi_applicable);

-- Organization-level LWF/TDS configuration (amounts configurable in Settings)
ALTER TABLE settings ADD COLUMN lwf_employee_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN lwf_employer_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN tds_percent REAL NOT NULL DEFAULT 0;

-- Traceable payroll items: persist every statutory component actually applied
ALTER TABLE payroll_items ADD COLUMN lwf REAL NOT NULL DEFAULT 0;
ALTER TABLE payroll_items ADD COLUMN tds REAL NOT NULL DEFAULT 0;

-- Statutory configuration registry (state/org level rates live here over time;
-- values are configuration only and do not guarantee legal compliance)
CREATE TABLE IF NOT EXISTS statutory_settings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  scope        TEXT NOT NULL DEFAULT 'organization',
  state_code   TEXT,
  component    TEXT NOT NULL,
  config_json  TEXT NOT NULL DEFAULT '{}',
  effective_from TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
