# CODEX TASK — Client dashboard P1: auth + shell

Founder-approved build ("fire p1", 2026-07-12). Spec: `wiki/synthesis/portal-content-studio-spec.md` (read it first). This task is P1 ONLY: credentialed login + the 8-section dashboard shell. No content-studio generation, no metrics math beyond what's stated. Claude reviews and deploys afterward — you do NOT deploy, do NOT touch remote D1, do NOT commit.

## Where the code lives

- Portal/funnels codebase: `output/standard-preview/` in this repo (Cloudflare Pages project pulsify-funnels; functions in `output/standard-preview/functions/`, migrations in `output/standard-preview/migrations/`, admin console at `admin/`).
- Existing client portal: token-link based (client portal pages + `/api/*` functions; portal links minted per client). KEEP token links working unchanged in parallel.
- Skin: look for the finished "Atelier" client design (`client.html`) — check this repo and `C:\Users\Abdullah\Desktop\pulsify-dashboard-sdr-build\`. If found, use its visual language for the new shell. If NOT found, do not guess or invent a new design system: build a clean minimal shell reusing the existing portal page styles, and state in your report that Atelier was not located.

## Build

1. **D1 migration** (next number in `output/standard-preview/migrations/`): `client_auth` table (client_id, email unique, pass_hash, pass_salt, created_at, updated_at) and `client_sessions` (token_hash, client_id, expires_at, created_at). Password hashing: PBKDF2 via WebCrypto (100k+ iterations, per-user salt). No plaintext anywhere, no new npm dependencies.
2. **Auth endpoints** under `output/standard-preview/functions/api/`: `client-login` (POST email+password -> session cookie, HttpOnly+Secure+SameSite=Lax, 30-day expiry, constant-time compare; rate limit: max 5 failed attempts per email per 15 min tracked in D1); `client-logout`; `client-set-password` (POST with a one-time setup token). Setup tokens are generated operator-side: add a small "Dashboard login" block to the existing `/admin` client editing surface that creates/regenerates a one-time set-password link for a client (reuse the admin auth already protecting /admin).
3. **Login page** `/portal/login` (or matching the existing portal URL scheme) — email + password, error states, on success -> the dashboard.
4. **Dashboard shell**: one client-scoped page with nav for the 8 sections — Revenue, Content, Performance, Team, Momentum, Plans, To-dos, Studio.
   - **Revenue**: wire read-only to the EXISTING payments table from the integrations hub (list of payments + running total + this-month total). Empty state if none: instructive text, not blank.
   - **Plans / To-dos / Team / Momentum**: render from a per-client JSON blob (new D1 table `client_dashboard_content`: client_id, section, json, updated_at), editable ONLY from /admin in P1 (add a plain JSON editor per section in the admin client view). To-dos render as a checklist; client-side check-off writes state back (one small POST endpoint, session-authed).
   - **Content / Performance / Studio**: instructive empty states describing what arrives in P2/P3 (one sentence each, no lorem).
   - Session-guard every dashboard page/API: valid session cookie OR the legacy token link for the same client.
5. **Copy rules**: all visible text in plain direct English, no emojis, no exclamation marks, sentence case. Per `wiki/content-engine/copy-voice-guide.md`.

## Verify (local only)

- `node --check` every touched JS file.
- Local D1: apply all migrations fresh, run `wrangler pages dev`, and exercise with curl: set-password via setup token -> login (bad password rejected, rate limit trips after 5) -> dashboard page 200 with cookie / 302 without -> to-do check-off persists -> payments render from a seeded local row.
- Do not deploy. Do not touch remote D1. Do not commit.

## Report

Append to `AGENT_CHAT.md`: files touched, migration number, how the session guard composes with legacy token links, verification transcript summary, anything you could not locate (Atelier), and any scope you deliberately left out. Clear your lock line.
