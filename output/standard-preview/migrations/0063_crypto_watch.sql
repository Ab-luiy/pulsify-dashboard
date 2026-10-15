-- Pulsify wallet watcher (pulsify-saas #24). Additive only.
-- incoming_transfers: every stablecoin transfer seen arriving at one of Pulsify's wallets. A transfer becomes a
-- receipt only once a client is attached; until then it waits as needs_client. Public chain data only.
CREATE TABLE IF NOT EXISTS incoming_transfers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_id    INTEGER NOT NULL,
  asset        TEXT NOT NULL,
  network      TEXT NOT NULL,
  txid         TEXT NOT NULL,
  log_index    INTEGER NOT NULL,
  from_address TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'needs_client' CHECK(status IN ('needs_client','receipted','dismissed','ignored')),
  client       TEXT,
  receipt_no   TEXT,
  seen_at      TEXT NOT NULL,
  notified_at  TEXT,
  UNIQUE (txid, log_index)
);
CREATE INDEX IF NOT EXISTS idx_incoming_transfers_status ON incoming_transfers (status, seen_at DESC);

-- Who a sending address belongs to, learned the first time the founder attaches a transfer to a client.
-- One address maps to one client; if two different clients ever share a sender it is removed, so a shared
-- exchange address never sends a receipt to the wrong person.
CREATE TABLE IF NOT EXISTS client_payer_addresses (
  address    TEXT PRIMARY KEY,
  client     TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Where the watcher stopped reading each wallet's chain.
CREATE TABLE IF NOT EXISTS crypto_watch_state (
  wallet_id  INTEGER PRIMARY KEY,
  last_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
