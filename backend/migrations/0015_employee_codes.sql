-- Migration 0015: Normalize employee codes from legacy "PWS####" to "SW####"
-- Older records were seeded/imported with a "PWS" prefix; the company code
-- convention is "SW####". Strip the leading "P" from any matching codes.

UPDATE employees
SET employee_code = REPLACE(employee_code, 'PWS', 'SW')
WHERE employee_code LIKE 'PWS%';
