-- Self-serve registration with operator approval (founder, 2026-10-01).
-- A person asks for access on the sign-in page; the operator approves or declines
-- from the console. Approving runs the normal provisioning (workspace plus the
-- welcome email with a one-time setup link).
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  link TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  decided_at TEXT,
  decided_by TEXT,
  client_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
