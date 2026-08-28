-- Migration 0014: Reports & MIS support
-- 1) Monthly late-mark / early-departure counts on attendance (Late/Early Report).
-- 2) Expenses table (Expense Report). Attendance is a monthly summary with no
--    daily punch times, so late/early are captured as monthly day counts here.

ALTER TABLE attendance_monthly ADD COLUMN late_marks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE attendance_monthly ADD COLUMN early_departures INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category        TEXT NOT NULL,
  description     TEXT,
  amount          REAL NOT NULL DEFAULT 0,
  expense_date    TEXT NOT NULL,
  payment_method  TEXT,
  vendor          TEXT,
  site_id         INTEGER,
  reference       TEXT,
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
