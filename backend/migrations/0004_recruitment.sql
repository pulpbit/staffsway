-- Recruitment & Joining module (append-only).
-- Openings = manpower requirement + job/position creation. Candidates carry the
-- pipeline status; interviews are per-round rows. Onboarding tasks seed a fixed
-- checklist when a candidate is marked joined (employee created).
CREATE TABLE IF NOT EXISTS job_openings (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  code               TEXT NOT NULL UNIQUE,
  title              TEXT NOT NULL,
  department         TEXT,
  site_id            INTEGER REFERENCES sites(id) ON DELETE SET NULL,
  positions_required INTEGER NOT NULL DEFAULT 1,
  status             TEXT NOT NULL DEFAULT 'open',
  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_job_openings_site ON job_openings(site_id);

CREATE TABLE IF NOT EXISTS candidates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT NOT NULL,
  mobile          TEXT,
  email           TEXT,
  opening_id      INTEGER REFERENCES job_openings(id) ON DELETE SET NULL,
  source          TEXT,
  experience      TEXT,
  expected_salary REAL,
  remarks         TEXT,
  status          TEXT NOT NULL DEFAULT 'new',
  joined_employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_candidates_opening ON candidates(opening_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

CREATE TABLE IF NOT EXISTS interviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  round        INTEGER NOT NULL DEFAULT 1,
  scheduled_at TEXT,
  interviewer  TEXT,
  mode         TEXT,
  outcome      TEXT NOT NULL DEFAULT 'pending',
  remarks      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interviews_candidate ON interviews(candidate_id);

ALTER TABLE employee_documents ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  task        TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  done_at     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_onboarding_employee ON onboarding_tasks(employee_id);
