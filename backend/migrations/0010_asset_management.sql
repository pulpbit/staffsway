-- Migration 0010: Asset Management
-- Asset registry + Issue/Return/Replacement history

CREATE TABLE IF NOT EXISTS assets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_code      TEXT NOT NULL UNIQUE,
  asset_type      TEXT NOT NULL,
  brand           TEXT,
  model           TEXT,
  serial_number   TEXT,
  purchase_date   TEXT,
  purchase_price  REAL,
  warranty_expiry TEXT,
  condition_notes TEXT,
  status          TEXT NOT NULL DEFAULT 'available',
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id        INTEGER NOT NULL,
  employee_id     INTEGER NOT NULL,
  action          TEXT NOT NULL,
  issue_date      TEXT NOT NULL,
  return_date     TEXT,
  replacement_id  INTEGER,
  reason          TEXT,
  performed_by    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (replacement_id) REFERENCES assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_asset_code ON assets(asset_code);
CREATE INDEX IF NOT EXISTS idx_asset_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_asset_assign_asset ON asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assign_employee ON asset_assignments(employee_id);
