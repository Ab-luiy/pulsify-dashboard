-- Where a client's Instagram followers are from (pulsify-saas #77). Additive only.
-- Instagram gives country and city totals only (top 45 each), never individual followers.
CREATE TABLE IF NOT EXISTS follower_places (
  client_id  TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('country','city')),
  place      TEXT NOT NULL,
  followers  INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (client_id, kind, place)
);
