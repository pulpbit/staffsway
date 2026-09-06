-- 0020: Employee address district fields + per-client employee codes
-- District (and permanent_district) complete the address block (mirrors clients/sites).
ALTER TABLE employees ADD COLUMN district TEXT;
ALTER TABLE employees ADD COLUMN permanent_district TEXT;

-- Re-code client-bound employees to <client_code><NNNN> (per-client sequence, ordered by id).
-- Employees without a site keep their existing code (e.g. SW0001), so the SW fallback
-- sequence continues count-based. Idempotent: already-matched codes are left alone.
WITH ranked AS (
  SELECT e.id,
         c.client_code AS cc,
         ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY e.id) AS rn
  FROM employees e
  JOIN sites s ON s.id = e.site_id
  JOIN clients c ON c.id = s.client_id
)
UPDATE employees
SET employee_code = (
  SELECT r.cc || printf('%04d', r.rn)
  FROM ranked r
  WHERE r.id = employees.id
)
WHERE EXISTS (SELECT 1 FROM ranked r WHERE r.id = employees.id)
  AND (
    employee_code IS NULL
    OR UPPER(employee_code) NOT LIKE (SELECT r.cc FROM ranked r WHERE r.id = employees.id) || '%'
  );