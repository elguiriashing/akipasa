PRAGMA foreign_keys = ON;

CREATE TABLE company_metrics (
  company_id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  cash_balance_minor INTEGER NOT NULL CHECK (cash_balance_minor >= 0),
  mrr_minor INTEGER NOT NULL DEFAULT 0 CHECK (mrr_minor >= 0),
  as_of TEXT NOT NULL
);

CREATE TABLE revenue_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company_metrics(company_id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  source TEXT NOT NULL,
  received_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX revenue_entries_company_date
  ON revenue_entries(company_id, received_at DESC);

CREATE TABLE expense_entries (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES company_metrics(company_id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  category TEXT NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  incurred_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX expense_entries_company_date
  ON expense_entries(company_id, incurred_at DESC);

CREATE TABLE request_nonces (
  device_id TEXT NOT NULL,
  nonce TEXT NOT NULL,
  command TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (device_id, nonce)
);

CREATE INDEX request_nonces_expiry ON request_nonces(expires_at);

CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  command TEXT NOT NULL,
  caller TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER CHECK (duration_ms >= 0),
  success INTEGER CHECK (success IN (0, 1)),
  error_code TEXT,
  error_message TEXT,
  result_json TEXT
);

CREATE INDEX execution_logs_started ON execution_logs(started_at DESC);
CREATE INDEX execution_logs_command ON execution_logs(command, started_at DESC);

CREATE TABLE generated_reports (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES execution_logs(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES company_metrics(company_id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  body TEXT NOT NULL,
  telegram_chat_id_suffix TEXT,
  telegram_message_id TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX generated_reports_created ON generated_reports(created_at DESC);

CREATE TABLE automation_jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  scheduled_for TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX automation_jobs_state_schedule
  ON automation_jobs(state, scheduled_for);
