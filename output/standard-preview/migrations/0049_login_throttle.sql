-- Sign-in throttling per address as well as per email (founder, 2026-10-01): wrong passwords from one
-- address no longer lock the real owner out from another, and one address cannot spray many emails.
ALTER TABLE client_login_attempts ADD COLUMN ip_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_client_login_attempts_ip_time ON client_login_attempts (ip_hash, attempted_at);
