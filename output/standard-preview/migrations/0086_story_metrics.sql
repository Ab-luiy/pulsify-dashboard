-- Story sequence metrics (founder 2026-10-30, pulsify-saas Instagram > Metrics).
-- Every story frame a connected account posts is read while it is up (Instagram only serves story
-- insights for 24 hours), frames posted close together are one sequence, and DMs that reply to a
-- story are tied to it. Read by functions/api/story-metrics.js, written by the sync worker's
-- story-capture job and _shared/client-dms.js.

-- One row per story frame, with its latest reading. The last reading before it expires is final.
CREATE TABLE IF NOT EXISTS story_frames (
  story_id       TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  account_id     TEXT NOT NULL,
  sequence_id    TEXT,
  n              INTEGER,
  posted_at      TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  media_type     TEXT,
  media_key      TEXT,             -- our copy of the frame in R2 pulsify-media (Instagram's links expire)
  permalink      TEXT,
  role           TEXT,             -- from a story board registration, when there is one
  elements_json  TEXT,
  tags_json      TEXT,
  has_link       INTEGER NOT NULL DEFAULT 0,
  views          INTEGER,
  reach          INTEGER,
  replies        INTEGER,
  shares         INTEGER,
  reposts        INTEGER,
  follows        INTEGER,
  profile_visits INTEGER,
  interactions   INTEGER,          -- total_interactions, kept for the likes check (founder option A)
  navigation     INTEGER,
  taps_forward   INTEGER,
  taps_back      INTEGER,
  exits          INTEGER,
  swipes_forward INTEGER,
  readings       INTEGER NOT NULL DEFAULT 0,
  first_seen_at  TEXT NOT NULL,
  last_read_at   TEXT,
  next_read_at   TEXT NOT NULL,
  final          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_story_frames_client ON story_frames (client_id, posted_at);
CREATE INDEX IF NOT EXISTS idx_story_frames_due ON story_frames (final, next_read_at);
CREATE INDEX IF NOT EXISTS idx_story_frames_sequence ON story_frames (sequence_id);

-- Frames posted within two hours of each other are one sequence. It counts on the day it was posted.
CREATE TABLE IF NOT EXISTS story_sequences (
  id              TEXT PRIMARY KEY,
  client_id       TEXT NOT NULL,
  posted_at       TEXT NOT NULL,
  posted_on       TEXT NOT NULL,
  look            TEXT,
  title           TEXT,            -- the client's own name for it
  source          TEXT NOT NULL DEFAULT 'instagram' CHECK (source IN ('board','instagram')),
  registration_id TEXT,
  cta_kind        TEXT,            -- 'link' or 'word'
  cta_label       TEXT,
  cta_word        TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_story_sequences_client ON story_sequences (client_id, posted_at);

-- What the story board says it is about to post (pulsify-saas docs/story-board-registration.md).
-- The next sequence the client posts takes it over.
CREATE TABLE IF NOT EXISTS story_registrations (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL,
  look        TEXT,
  title       TEXT,
  frames_json TEXT NOT NULL,
  cta_kind    TEXT,
  cta_label   TEXT,
  cta_word    TEXT,
  created_at  TEXT NOT NULL,
  used_by     TEXT
);
CREATE INDEX IF NOT EXISTS idx_story_registrations_client ON story_registrations (client_id, created_at);

-- When each account's live stories were last listed.
CREATE TABLE IF NOT EXISTS story_scans (
  account_id TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL,
  scanned_at TEXT NOT NULL
);

-- One row per DM that replied to a story. Like ig_dm_events, the words are not kept.
CREATE TABLE IF NOT EXISTS story_replies (
  message_id             TEXT PRIMARY KEY,
  client_id              TEXT NOT NULL,
  contact_id             TEXT NOT NULL,
  story_id               TEXT NOT NULL,
  at                     TEXT NOT NULL,
  emoji_only             INTEGER NOT NULL DEFAULT 0,
  has_word               INTEGER NOT NULL DEFAULT 0,  -- replied with the sequence's word
  zernio_conversation_id TEXT,
  account_id             TEXT
);
CREATE INDEX IF NOT EXISTS idx_story_replies_story ON story_replies (client_id, story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_contact ON story_replies (client_id, contact_id, at);

-- Who a conversation was with. The AI gives the first label; the setter's choice replaces it.
CREATE TABLE IF NOT EXISTS story_conversation_labels (
  client_id   TEXT NOT NULL,
  contact_id  TEXT NOT NULL,
  sequence_id TEXT NOT NULL,
  label       TEXT NOT NULL CHECK (label IN ('interested','not_ready','friend','operator','selling')),
  labelled_by TEXT NOT NULL CHECK (labelled_by IN ('ai','setter')),
  labelled_at TEXT NOT NULL,
  PRIMARY KEY (client_id, contact_id, sequence_id)
);
