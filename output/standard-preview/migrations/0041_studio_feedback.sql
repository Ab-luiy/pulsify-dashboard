-- Growth #18: the review gate teaches the generator.
-- Every rejection reason is kept here (studio_sequences.review_note is cleared when the
-- client resubmits, so it cannot be the memory). scope 'client' = that client's drafts only,
-- scope 'all' = every client's drafts (the operator promotes it).

CREATE TABLE IF NOT EXISTS studio_feedback (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id    TEXT NOT NULL,
  sequence_id  INTEGER,
  rule         TEXT NOT NULL,
  scope        TEXT NOT NULL DEFAULT 'client',
  active       INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_feedback_client
  ON studio_feedback (client_id, active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_studio_feedback_scope
  ON studio_feedback (scope, active, created_at DESC);
