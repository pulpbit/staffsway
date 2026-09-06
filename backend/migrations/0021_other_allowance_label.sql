-- 0021: Other Allowance field name on salary structures
-- Captures what the non-standard allowance component is called (e.g. "Performance Allowance").
ALTER TABLE salary_structures ADD COLUMN other_allowance_label TEXT;