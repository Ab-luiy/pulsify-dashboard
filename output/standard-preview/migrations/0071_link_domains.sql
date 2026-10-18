-- Tracked links on the client's own domain (pulsify-saas #73). Additive only.
-- One domain or subdomain per client, for example go.clientname.com. 'waiting' until the check sees
-- both the client's DNS record and the domain attached to the Pages project; then 'active' and the
-- links the app shows use it. Rules in _shared/link-domains.js.
CREATE TABLE IF NOT EXISTS link_domains (
  host         TEXT PRIMARY KEY,
  client       TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active')),
  created_at   TEXT NOT NULL,
  checked_at   TEXT,
  activated_at TEXT,
  check_json   TEXT
);
