-- Migration 0008: Performance Management
-- KPI/KRA, Goals, Reviews, Feedback, Self-Appraisal, Ratings,
-- History, Increment/Promotion Recommendations, PIP

CREATE TABLE IF NOT EXISTS performance_kpis (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  fiscal_year     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL DEFAULT 'quality',
  weight          REAL NOT NULL DEFAULT 0,
  target          TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_goals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  fiscal_year     INTEGER NOT NULL,
  quarter         INTEGER,
  title           TEXT NOT NULL,
  description     TEXT,
  target_value    TEXT,
  actual_value    TEXT,
  weight          REAL NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'not_started',
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  review_period   TEXT NOT NULL,
  review_type     TEXT NOT NULL DEFAULT 'quarterly',
  reviewer_id     INTEGER,
  reviewer_name   TEXT,
  overall_rating  REAL,
  strengths       TEXT,
  improvements    TEXT,
  comments        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_feedback (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  review_id       INTEGER,
  feedback_type   TEXT NOT NULL DEFAULT 'manager',
  from_employee_id INTEGER,
  from_name       TEXT,
  rating          REAL,
  strengths       TEXT,
  areas_improvement TEXT,
  comments        TEXT,
  is_anonymous    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (review_id) REFERENCES performance_reviews(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS self_appraisals (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  fiscal_year     INTEGER NOT NULL,
  quarter         INTEGER,
  achievements    TEXT,
  challenges      TEXT,
  goals_next_period TEXT,
  training_needs  TEXT,
  overall_comments TEXT,
  status          TEXT NOT NULL DEFAULT 'draft',
  submitted_at    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  action          TEXT NOT NULL,
  details         TEXT,
  performed_by    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS increment_recommendations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  fiscal_year     INTEGER NOT NULL,
  recommended_by  TEXT,
  current_salary  REAL,
  recommended_increment REAL,
  increment_percent REAL,
  justification   TEXT,
  performance_score REAL,
  status          TEXT NOT NULL DEFAULT 'pending',
  reviewed_by     TEXT,
  reviewed_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS promotion_recommendations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  fiscal_year     INTEGER NOT NULL,
  recommended_by  TEXT,
  current_designation TEXT,
  recommended_designation TEXT,
  justification   TEXT,
  performance_score REAL,
  status          TEXT NOT NULL DEFAULT 'pending',
  reviewed_by     TEXT,
  reviewed_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS performance_pips (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  start_date      TEXT NOT NULL,
  end_date        TEXT NOT NULL,
  goals           TEXT,
  status          TEXT NOT NULL DEFAULT 'active',
  outcome         TEXT,
  manager_comments TEXT,
  created_by      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_perf_kpi_employee ON performance_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_employee ON performance_goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_feedback_employee ON performance_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_self_appraisal_employee ON self_appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_history_employee ON performance_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_increment_rec_employee ON increment_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_promotion_rec_employee ON promotion_recommendations(employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_pip_employee ON performance_pips(employee_id);
