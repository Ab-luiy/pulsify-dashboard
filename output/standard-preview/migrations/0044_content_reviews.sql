-- Growth #18: the founder's review gate for guided content other than story sequences (YouTube packages
-- first, carousels later). The client sends a video project for review; the operator approves it or sends
-- it back with a reason. Review state lives here, never in workspace_records.data, which the client can
-- write. snapshot_json is the package as sent, so later edits don't change what was reviewed and approved
-- snapshots can be shown to the generator as examples. Rejection reasons are also written to
-- studio_feedback as rules (migration 0042).

CREATE TABLE IF NOT EXISTS content_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id      TEXT NOT NULL,
  record_id      TEXT NOT NULL,
  format         TEXT NOT NULL DEFAULT 'youtube',
  title          TEXT NOT NULL,
  snapshot_json  TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'review',
  review_note    TEXT,
  submitted_at   TEXT NOT NULL,
  decided_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_content_reviews_status
  ON content_reviews (status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reviews_client
  ON content_reviews (client_id, format, status, decided_at DESC);

CREATE INDEX IF NOT EXISTS idx_content_reviews_record
  ON content_reviews (client_id, record_id, id DESC);
