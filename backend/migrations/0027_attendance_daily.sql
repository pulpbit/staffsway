-- Attendance System v2: day-by-day grid.
-- Additive only — no existing data is modified or dropped.

-- Per-day attendance marks (source of truth for the new grid).
-- Mark values: P (present), A (absent), R (rest), HD (holiday), HF (half day), L (leave / loss of pay).
CREATE TABLE IF NOT EXISTS attendance_daily (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,
  mark       TEXT NOT NULL CHECK (mark IN ('P','A','R','HD','HF','L')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (employee_id, date)
);
CREATE INDEX IF NOT EXISTS idx_attd_date ON attendance_daily(date);
CREATE INDEX IF NOT EXISTS idx_attd_employee ON attendance_daily(employee_id);

-- Per-site weekly rest day (default Sunday). Values are 3-letter day names.
ALTER TABLE sites ADD COLUMN weekly_off TEXT NOT NULL DEFAULT 'Sun';

-- Monthly aggregate snapshot (recomputed from attendance_daily on save).
-- NULL until first saved; keeps existing rows untouched and lets callers fall back
-- to the legacy present/absent/paid/unpaid counts for months without a grid.
ALTER TABLE attendance_monthly ADD COLUMN total_days INTEGER;
ALTER TABLE attendance_monthly ADD COLUMN rest_days INTEGER;
ALTER TABLE attendance_monthly ADD COLUMN holiday_days INTEGER;
ALTER TABLE attendance_monthly ADD COLUMN half_days REAL;
ALTER TABLE attendance_monthly ADD COLUMN leave_days INTEGER;
ALTER TABLE attendance_monthly ADD COLUMN ot_days REAL;
ALTER TABLE attendance_monthly ADD COLUMN payable_days REAL;
ALTER TABLE attendance_monthly ADD COLUMN actual_salary REAL;