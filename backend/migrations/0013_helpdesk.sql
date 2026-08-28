-- Migration 0013: HR Helpdesk Enhancement
-- Extends hr_requests with category, priority, multi-level workflow,
-- assignment, and action tracking

ALTER TABLE hr_requests ADD COLUMN category TEXT NOT NULL DEFAULT 'other';
ALTER TABLE hr_requests ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE hr_requests ADD COLUMN assigned_to TEXT;
ALTER TABLE hr_requests ADD COLUMN manager_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE hr_requests ADD COLUMN manager_by TEXT;
ALTER TABLE hr_requests ADD COLUMN manager_remarks TEXT;
ALTER TABLE hr_requests ADD COLUMN manager_at TEXT;
ALTER TABLE hr_requests ADD COLUMN hr_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE hr_requests ADD COLUMN hr_by TEXT;
ALTER TABLE hr_requests ADD COLUMN hr_remarks TEXT;
ALTER TABLE hr_requests ADD COLUMN hr_at TEXT;
ALTER TABLE hr_requests ADD COLUMN action_notes TEXT;
ALTER TABLE hr_requests ADD COLUMN action_by TEXT;
ALTER TABLE hr_requests ADD COLUMN action_at TEXT;
ALTER TABLE hr_requests ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS helpdesk_comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      INTEGER NOT NULL,
  employee_id     INTEGER,
  comment_by      TEXT NOT NULL,
  comment         TEXT NOT NULL,
  is_internal     INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES hr_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_helpdesk_category ON hr_requests(category);
CREATE INDEX IF NOT EXISTS idx_helpdesk_status ON hr_requests(status);
CREATE INDEX IF NOT EXISTS idx_helpdesk_priority ON hr_requests(priority);
CREATE INDEX IF NOT EXISTS idx_helpdesk_comments_req ON helpdesk_comments(request_id);
