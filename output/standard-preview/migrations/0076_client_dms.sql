-- Client Instagram DMs linked to lead records (pulsify-saas #76). Additive only.
-- Nothing writes here until a client's Instagram is connected through Zernio.

-- Which client owns a connected Instagram account (Zernio account id).
CREATE TABLE IF NOT EXISTS zernio_client_accounts (
  account_id   TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL,
  username     TEXT,
  connected_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_zernio_client_accounts_client ON zernio_client_accounts (client_id);

-- Everyone who has messaged a client's Instagram: their Instagram id, username and name from
-- the Meta profile, and the lead they were linked to once their email, phone or handle is known.
CREATE TABLE IF NOT EXISTS ig_contacts (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  ig_user_id     TEXT NOT NULL,
  ig_username    TEXT,
  ig_name        TEXT,
  lead_email     TEXT,
  lead_phone     TEXT,
  link_source    TEXT,
  first_dm_at    TEXT NOT NULL,
  last_dm_at     TEXT NOT NULL,
  first_ref      TEXT,
  first_ref_label TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (client_id, ig_user_id)
);
CREATE INDEX IF NOT EXISTS idx_ig_contacts_username ON ig_contacts (client_id, ig_username);

-- One row per message, for the lead's journey. The words themselves are not kept here.
CREATE TABLE IF NOT EXISTS ig_dm_events (
  message_id TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  direction  TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  at         TEXT NOT NULL,
  ref        TEXT,
  ref_label  TEXT
);
CREATE INDEX IF NOT EXISTS idx_ig_dm_events_contact ON ig_dm_events (client_id, contact_id, at);
