CREATE TABLE IF NOT EXISTS sales_targets (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  member_id TEXT,
  metric TEXT NOT NULL CHECK(metric IN ('calls_taken','show_rate','close_rate','cash_collected_cents','eod_forms_filed')),
  period TEXT NOT NULL CHECK(period IN ('week','month')),
  target REAL NOT NULL CHECK(target >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS sales_targets_scope ON sales_targets(client_id, COALESCE(member_id,''), metric, period);
