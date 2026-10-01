-- Pulsify income (pulsify-saas #24, founder 2026-10-01: clients pay in crypto because Stripe and Wise
-- are unavailable in Turkey). A receipt is issued in the same step that records the payment, so a
-- receipt always means a payment was received. The payment itself lives in `payments` (rail 'crypto',
-- reference = the transaction id); this table holds the receipt and the wallets clients pay to.
-- Wallet addresses are public by nature. No private key or seed ever goes in this database.

CREATE TABLE IF NOT EXISTS receipts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_no   TEXT NOT NULL UNIQUE,
  token        TEXT NOT NULL UNIQUE,
  payment_id   INTEGER NOT NULL UNIQUE,
  client       TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'USD',
  asset        TEXT NOT NULL,
  network      TEXT NOT NULL,
  txid         TEXT NOT NULL,
  note         TEXT,
  issued_at    TEXT NOT NULL,
  issued_by    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_client ON receipts (client, issued_at DESC);

CREATE TABLE IF NOT EXISTS pulsify_wallets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  asset      TEXT NOT NULL,
  network    TEXT NOT NULL,
  address    TEXT NOT NULL,
  label      TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  UNIQUE (asset, network, address)
);
