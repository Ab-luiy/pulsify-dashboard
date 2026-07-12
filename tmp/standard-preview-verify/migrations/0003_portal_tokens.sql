-- Per-client portal access tokens (a client's private login link).
-- We store only the SHA-256 hash of the token, never the token itself.
-- Run once against the pulsify-portal D1 database.

ALTER TABLE client_config ADD COLUMN portal_token_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_client_config_portal_token
  ON client_config (portal_token_hash);
