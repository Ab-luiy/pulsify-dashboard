-- Acquisition-page management and lead-attributed share links.
ALTER TABLE client_config ADD COLUMN page_active INTEGER DEFAULT 1;
ALTER TABLE client_config ADD COLUMN prospect_email TEXT;
ALTER TABLE client_config ADD COLUMN acquisition_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_config_acquisition_token
  ON client_config (acquisition_token);
