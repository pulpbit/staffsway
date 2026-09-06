-- Migration 0016: Expand clients table into the full Client Master
-- Supports the requirement: Client Code (business identifier), two-part contact
-- details, registered address, documents (GST/PAN), payroll settings, bank details.
-- The internal `id` remains the permanent primary key for all relationships.
-- Legacy columns (phone, contract_start, contract_end, contact_person, email,
-- address) are left dormant to avoid a destructive table rebuild; code no longer
-- uses them.

ALTER TABLE clients ADD COLUMN client_code TEXT;

-- Backfill client codes for existing rows so the UNIQUE index can be created.
-- Uses the leading initials of each significant word in the client name.
UPDATE clients
SET client_code = (
  SELECT UPPER(
    GROUP_CONCAT(SUBSTR(t.word, 1, 1), '')
  )
  FROM (
    WITH RECURSIVE split(name_part, rest) AS (
      SELECT '', TRIM(name) || ' '
      UNION ALL
      SELECT
        SUBSTR(rest, 1, INSTR(rest, ' ') - 1),
        LTRIM(SUBSTR(rest, INSTR(rest, ' ') + 1))
      FROM split
      WHERE rest != ''
    )
    SELECT s.name_part AS word
    FROM split s
    WHERE s.name_part != ''
  ) t
)
WHERE client_code IS NULL OR client_code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_client_code ON clients(client_code);

-- Two-part contact details
ALTER TABLE clients ADD COLUMN primary_contact_person TEXT;
ALTER TABLE clients ADD COLUMN hr_contact_person TEXT;
ALTER TABLE clients ADD COLUMN company_email TEXT;

-- Registered address (structured)
ALTER TABLE clients ADD COLUMN address_line1 TEXT;
ALTER TABLE clients ADD COLUMN address_line2 TEXT;
ALTER TABLE clients ADD COLUMN city TEXT;
ALTER TABLE clients ADD COLUMN state TEXT;
ALTER TABLE clients ADD COLUMN district TEXT;
ALTER TABLE clients ADD COLUMN pincode TEXT;

-- Documents data
ALTER TABLE clients ADD COLUMN gst_no TEXT;
ALTER TABLE clients ADD COLUMN company_pan TEXT;

-- Payroll settings
ALTER TABLE clients ADD COLUMN payroll_cycle TEXT DEFAULT 'monthly';
ALTER TABLE clients ADD COLUMN salary_calculation TEXT DEFAULT 'calendar_days';
ALTER TABLE clients ADD COLUMN overtime_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN leave_policy_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN arrears_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN advance_loan_enabled INTEGER NOT NULL DEFAULT 0;

-- Bank & payment details
ALTER TABLE clients ADD COLUMN bank_name TEXT;
ALTER TABLE clients ADD COLUMN bank_account TEXT;
ALTER TABLE clients ADD COLUMN bank_ifsc TEXT;
ALTER TABLE clients ADD COLUMN bank_account_holder TEXT;