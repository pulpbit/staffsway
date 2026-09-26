-- 0029: Referrer registration channel.
--
-- A referrer is a person who refers staff to Staffsway and registers them on the
-- company's behalf. This is NOT a commercial supplier arrangement: there is no
-- billing, no per-day charge, no agreement and no GST tracking here. A referrer
-- record is deliberately just enough to identify and contact them.
--
-- Flow: a shared public link -> short registration form -> HR reviews it ->
-- approving it creates a real employee through the same writer that the Employee
-- Master form and the recruitment "Join" action use.
--
-- Two things are deliberately NOT done here:
--   * No rows are back-dated into referrer_applications. Existing employees have
--     no known referrer, so their source stays unset.
--   * `employees.source` is left NULL for existing rows rather than defaulting
--     to 'direct', so a report can tell "added before provenance existed" apart
--     from "added directly through the form".

-- 1. Referrer master. Admin-maintained; the public form only ever reads the
--    active rows, and never exposes contact details.
CREATE TABLE IF NOT EXISTS referrers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_code     TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  contact_person    TEXT,
  phone             TEXT,
  email             TEXT,
  status            TEXT NOT NULL DEFAULT 'active',
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrers_name ON referrers(name);
CREATE INDEX IF NOT EXISTS idx_referrers_status ON referrers(status);

-- 2. Public registrations. One row per submitted person, held for review.
--    Deliberately a separate table from `candidates`: the recruitment pipeline
--    models screening/interview/offer, whereas this is a straight
--    submit -> review -> create-employee flow with its own review audit trail.
CREATE TABLE IF NOT EXISTS referrer_applications (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  referrer_id             INTEGER REFERENCES referrers(id) ON DELETE SET NULL,

  -- Candidate essentials only. Salary, designation, department, site and
  -- joining date are HR inputs at approval time, not public inputs.
  full_name               TEXT NOT NULL,
  aadhaar                 TEXT NOT NULL,
  father_name             TEXT,
  gender                  TEXT,
  dob                     TEXT,
  marital_status          TEXT,
  nationality             TEXT DEFAULT 'Indian',
  mobile                  TEXT NOT NULL,
  alternate_mobile        TEXT,
  email                   TEXT,
  address                 TEXT,
  state                   TEXT,
  district                TEXT,
  pincode                 TEXT,
  permanent_same_as_present INTEGER NOT NULL DEFAULT 0,
  permanent_address       TEXT,
  permanent_state         TEXT,
  permanent_district      TEXT,
  permanent_pincode       TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  bank_name               TEXT,
  bank_holder_name        TEXT,
  bank_account            TEXT,
  bank_ifsc               TEXT,
  pan                     TEXT,
  uan                     TEXT,
  esi_number              TEXT,
  experience              TEXT,
  previous_employment     TEXT,

  status                  TEXT NOT NULL DEFAULT 'pending',
  rejection_reason        TEXT,
  reviewed_by             INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at             TEXT,
  employee_id             INTEGER REFERENCES employees(id) ON DELETE SET NULL,

  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrer_applications_status ON referrer_applications(status);
CREATE INDEX IF NOT EXISTS idx_referrer_applications_referrer ON referrer_applications(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrer_applications_created ON referrer_applications(created_at);
CREATE INDEX IF NOT EXISTS idx_referrer_applications_employee ON referrer_applications(employee_id);

-- 3. Aadhaar is the registration channel's identity key, so uniqueness has to
--    hold even when two people submit at the same instant. This partial index
--    also closes a pre-existing gap: the duplicate check in routes/employees.ts
--    was application-level only, so the bulk-import path could insert a second
--    row for the same Aadhaar. Safe to add now because every seeded Aadhaar is
--    generated as '7896' + a zero-padded employee id (scripts/seed-data.mjs).
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_aadhaar_unique
  ON employees(aadhaar) WHERE aadhaar IS NOT NULL;

-- 4. Stop the same person being submitted twice while the first application is
--    still under review. Partial, so a rejected application can be resubmitted
--    (and an approved one keeps its own history row).
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrer_applications_pending_aadhaar
  ON referrer_applications(aadhaar) WHERE status = 'pending';

-- 5. Provenance on the employee. Without this, once the person exists there is
--    no way to answer "how did this worker join" without a join through the
--    applications table on every report.
ALTER TABLE employees ADD COLUMN source TEXT;
ALTER TABLE employees ADD COLUMN referrer_id INTEGER REFERENCES referrers(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN referrer_application_id INTEGER REFERENCES referrer_applications(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_employees_referrer ON employees(referrer_id);
CREATE INDEX IF NOT EXISTS idx_employees_source ON employees(source);
