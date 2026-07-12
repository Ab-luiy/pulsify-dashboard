-- Records silent failures in the funnel pipe: rejected Typeform webhooks
-- (bad signature or unparseable payload) and failed Kit API deliveries.
-- Nothing here blocks the original request path — it's write-only telemetry
-- for the operator (see functions/api/health.js and the campaign board).
-- Run once against the pulsify-portal D1 database.

CREATE TABLE IF NOT EXISTS delivery_failures (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  client TEXT NOT NULL,
  kind   TEXT NOT NULL,
  detail TEXT,
  at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_failures_client_at ON delivery_failures (client, at);
