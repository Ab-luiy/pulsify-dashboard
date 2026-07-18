# CODEX TASK — god-view Phase 2: read-only client impersonation

Author: Claude. Date: 2026-07-16. Model: gpt-5.6-sol. Security-sensitive: read this whole file before any edit, and prefer refusing a shortcut over weakening a guarantee.

The operator opens any client's portal exactly as the client sees it, without the client's password, invisibly to the client. From the master architecture. The four guarantees below are the task; the UI is secondary.

## The four guarantees (non-negotiable)

1. **Read-only, enforced server-side.** An impersonation session can never mutate client data. Every write path must reject it. UI hiding is not enforcement.
2. **Short-lived.** Impersonation sessions expire after 30 minutes, hard, server-checked.
3. **Audited.** Minting and use are logged to the existing `operator_events` table (actor, action=impersonate-start, client, created_at). The command center's recent-activity list shows them.
4. **Unforgeable and non-escalating.** Only ADMIN_KEY can mint one. An impersonation token must never be usable to mint another, change a password, rotate tokens, or reach admin endpoints.

## Build

1. **Migration 0016 (additive):** either a new `impersonation_sessions` table (token_hash, client_id, created_at, expires_at, created_by) or an additive nullable `impersonated` column on `client_sessions` — pick whichever fits the existing session code more cleanly; keep it additive.
2. **Mint endpoint** `functions/api/impersonate.js` (ADMIN_KEY gated, 401 otherwise): POST {client} -> creates a session marked impersonated with a 30-minute expiry, returns a one-time URL (e.g. `/portal/?imp=<token>` or the existing session-cookie mechanism if cleaner). Logs impersonate-start to operator_events. Rate-limit lightly (same pattern as login attempts if trivially reusable).
3. **Session layer:** wherever the portal resolves the session cookie (read the existing P1 auth code in `functions/portal/[[path]].js` / the shared auth helper), an impersonated session resolves like a client session but carries `impersonated: true` and is rejected if expired.
4. **Write-path enforcement.** Every client-scoped endpoint that mutates must reject impersonated sessions with 403 {error:"read only"}. Enumerate them by grepping for the client-auth helper across `functions/api/`: client-brain writes, media-upload, studio-generate, studio-sequences client actions, client-dashboard-todo, client-integrations connect/delete, client-set-password, client-logout can stay (logout just ends the session). Add the check in the SHARED auth helper (one place: e.g. `resolveClientAccess(request, env, {allowImpersonated:false})` default-false for writes, opt-in true for reads) rather than per-file copies, then set the opt-in on read endpoints. State in the done note exactly which endpoints accept impersonated reads and which reject writes.
5. **Portal banner:** when the session is impersonated, the portal shows a thin fixed banner "Operator view, read only" and hides nothing else (the point is to see what the client sees). The banner is cosmetic; enforcement is item 4.
6. **Command center wiring:** a "View as client" button per client row in the /admin command center that calls the mint endpoint with the stored admin key and opens the returned URL in a new tab. Impersonate-start events appear in the recent operator activity list.

## Tests (mocked D1, the core of this task)

- Mint without ADMIN_KEY -> 401. Mint -> token works on a read endpoint (dashboard/brain read) and returns the client's data.
- EVERY enumerated write endpoint rejects the impersonated session with 403 while still accepting a normal client session (test at least: client-brain write, media-upload, studio-generate, todo toggle).
- Expired impersonation session -> 401 on reads too.
- Impersonation token cannot hit the mint endpoint or any ADMIN_KEY surface.
- operator_events row written on mint.
- All existing suites still pass.

## Discipline

LOCAL-VERIFY ONLY; migration additive; NO deploy, NO remote D1, NO commit, NO secrets; no em-dashes/en-dashes, no reward copy. Claim files on the AGENT_CHAT.md Lock Board first; post a done note with the exact endpoint-by-endpoint read/write enforcement list + verification. Claude reviews (the four guarantees are the review), runs the migration, deploys.
