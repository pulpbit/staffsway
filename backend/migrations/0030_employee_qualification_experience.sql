-- Employee qualification and total experience.
--
-- Additive and backward compatible: every column is nullable, so existing
-- employees read back as NULL and no backfill is required.
--
-- experience_years / experience_months are stored separately rather than as one
-- "5 years 3 months" string so they stay sortable and filterable. This is a
-- deliberately NEW pair of columns and does NOT reuse `previous_employment`,
-- which stays free text about the prior employer.

ALTER TABLE employees ADD COLUMN qualification TEXT;

ALTER TABLE employees ADD COLUMN experience_years INTEGER;

ALTER TABLE employees ADD COLUMN experience_months INTEGER;