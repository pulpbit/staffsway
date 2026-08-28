-- Employee master completeness: personal/contact/employment fields + exit statuses.
-- Append-only; safe on existing data (all new columns nullable).
ALTER TABLE employees ADD COLUMN father_name TEXT;
ALTER TABLE employees ADD COLUMN aadhaar TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE employees ADD COLUMN grade TEXT;
ALTER TABLE employees ADD COLUMN reporting_manager TEXT;
ALTER TABLE employees ADD COLUMN previous_employment TEXT;
