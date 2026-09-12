-- Backfill Aadhaar Card / PAN Card document records for employees that already
-- have identity numbers on the master record but no document rows yet.
-- Idempotent: skips any employee already holding a document of that type.
INSERT INTO employee_documents (employee_id, document_type, document_number, verified)
SELECT e.id, 'Aadhaar Card', e.aadhaar, 0
FROM employees e
WHERE e.aadhaar IS NOT NULL AND e.aadhaar != ''
  AND NOT EXISTS (
    SELECT 1 FROM employee_documents d WHERE d.employee_id = e.id AND d.document_type = 'Aadhaar Card'
  );

INSERT INTO employee_documents (employee_id, document_type, document_number, verified)
SELECT e.id, 'PAN Card', e.pan, 0
FROM employees e
WHERE e.pan IS NOT NULL AND e.pan != ''
  AND NOT EXISTS (
    SELECT 1 FROM employee_documents d WHERE d.employee_id = e.id AND d.document_type = 'PAN Card'
  );