-- Match a person by email, phone or Instagram handle (pulsify-saas #74, founder 2026-10-17). Additive only.

-- The Instagram handle a person gave on the application form or a capture page.
ALTER TABLE leads ADD COLUMN ig_handle TEXT;

-- What the operator decided about two records that might be one person. 'same' joins them for good,
-- 'different' stops them being suggested or merged again. key_a / key_b are identity nodes:
-- e:<email>, c:<Instagram contact id> or v:<browser id>.
CREATE TABLE IF NOT EXISTS lead_merge_decisions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id  TEXT NOT NULL,
  key_a      TEXT NOT NULL,
  key_b      TEXT NOT NULL,
  decision   TEXT NOT NULL CHECK (decision IN ('same','different')),
  decided_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  UNIQUE (client_id, key_a, key_b)
);
CREATE INDEX IF NOT EXISTS idx_lead_merge_client ON lead_merge_decisions (client_id);
