// Nightly sweep of sign-in leftovers, so the request path never has to do it. Every query is safe to
// repeat. Live sessions, unexpired links and recent attempts are never touched.
import { nowIso } from "./common.js";

const hoursAgo = (hours) => new Date(Date.now() - hours * 3600 * 1000).toISOString();

const SWEEPS = [
  ["client sessions", "DELETE FROM client_sessions WHERE expires_at < ?", () => nowIso()],
  ["preview sessions", "DELETE FROM impersonation_sessions WHERE expires_at < ?", () => nowIso()],
  ["team sessions", "DELETE FROM operator_sessions WHERE expires_at < ? OR (revoked_at IS NOT NULL AND revoked_at < ?)", () => [nowIso(), hoursAgo(24 * 7)]],
  ["setup links", "DELETE FROM client_setup_tokens WHERE expires_at < ?", () => nowIso()],
  ["email codes", "DELETE FROM client_email_codes WHERE expires_at < ?", () => nowIso()],
  ["sign-in misses", "DELETE FROM client_login_attempts WHERE attempted_at < ?", () => hoursAgo(24)],
  ["rate buckets", "DELETE FROM api_key_usage WHERE bucket < ? AND (key_id LIKE 'login-link:%' OR key_id LIKE 'access-req:%' OR key_id LIKE 'setup-code:%')", () => hoursAgo(48).slice(0, 13)],
];

export async function authCleanup(env) {
  if (!env?.DB) return {};
  const removed = {};
  for (const [name, sql, args] of SWEEPS) {
    try {
      const bind = [args()].flat();
      const result = await env.DB.prepare(sql).bind(...bind).run();
      removed[name] = Number(result?.meta?.changes || 0);
    } catch {
      removed[name] = -1; // a missing table or a hiccup never stops the other sweeps
    }
  }
  return removed;
}
