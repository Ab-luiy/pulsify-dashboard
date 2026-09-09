CREATE TABLE IF NOT EXISTS contract_provisioning (
  envelope_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  email TEXT NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('pending','delivered','existing','expired')),
  invitation_cipher TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  delivered_at TEXT
);
