-- Ticket #80: contracts sent from the booked pipeline (DocuSign popup).
-- One row per contract. The CRM prospect key ties it to the pipeline card.
-- status: draft (saved, not sent), sending (being handed to DocuSign), sent, signed, declined, voided.
-- Money is stored in cents. Not applied live until the founder says so.
CREATE TABLE IF NOT EXISTS contracts (
  id                  TEXT PRIMARY KEY,
  crm_key             TEXT NOT NULL,
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  upfront_cents       INTEGER NOT NULL DEFAULT 500000,
  fee_percent         INTEGER NOT NULL DEFAULT 30,
  start_revenue_cents INTEGER NOT NULL,
  notes               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','signed','declined','voided')),
  envelope_id         TEXT,
  send_error          TEXT,
  created_by          TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  sent_at             TEXT,
  signed_at           TEXT
);
CREATE INDEX IF NOT EXISTS idx_contracts_crm_key ON contracts (crm_key, created_at);
CREATE INDEX IF NOT EXISTS idx_contracts_envelope ON contracts (envelope_id);
