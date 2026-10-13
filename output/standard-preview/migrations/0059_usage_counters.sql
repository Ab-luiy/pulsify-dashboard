-- Daily per-client counters for metered features (founder 2026-10-13: subject cutouts draw on the free
-- Cloudflare Images allowance, 5,000 a month for the whole account). One row per client, feature and UTC day.
CREATE TABLE IF NOT EXISTS usage_counters (
  client TEXT NOT NULL,
  kind TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (client, kind, day)
);
