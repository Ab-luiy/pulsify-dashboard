-- Explicitly map a verified PropelAuth user and organization to one Pulsify client.
-- No automatic email-to-tenant linking: an operator must approve each identity.
CREATE TABLE IF NOT EXISTS client_provider_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, provider_user_id, provider_org_id),
  UNIQUE (provider, provider_user_id, client_id),
  FOREIGN KEY (client_id) REFERENCES client_config(client)
);
CREATE INDEX IF NOT EXISTS idx_client_provider_identities_client
  ON client_provider_identities(client_id);
