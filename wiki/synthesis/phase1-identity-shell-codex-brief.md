---
type: synthesis
tags: [portal, dashboard, infra, design-system]
sources: [[wiki/synthesis/pulsify-command-center-architecture-2026-09-17]], [[wiki/synthesis/kendo-port-codex-brief]], [[wiki/playbooks/account-registry]], live probes 2026-09-17
created: 2026-09-17
updated: 2026-09-17
---

# Phase 1 Codex brief: one identity, one shell

Self-contained build brief for Codex. Phase 0 (accounts) is complete and verified on 2026-09-17. This phase makes the operator surfaces private behind the founder's Google login and mounts every surface inside one shell with a one-click launcher. Read [[account-registry]] for every ID. Never put a secret value in a file, a log, or a chat message.

## Verified starting state (probed 2026-09-17)

| Check | Result |
|---|---|
| `https://pulsify-ai.com/frank-wieler` | 200, landing pages serve on the apex |
| `https://pulsify-ai.com/admin` and `https://www.pulsify-ai.com/admin` | 302 to `pulsify-ai.cloudflareaccess.com` login, `kid` matches the AUD in the registry |
| `https://pulsify-funnels.pages.dev/admin` | 200 with no login. **The bypass is real.** |
| `https://pulsify-ai.com/portal/login` | 200, client login unchanged |
| `https://pulsify-dashboard.pages.dev/` | 200 with no login. **Still public.** |
| Access certs endpoint | Live, RS256 keys present |
| Resend DKIM and MX records | Resolving |
| Secrets on pulsify-funnels | Founder reports eight names (see registry). Not verifiable from this environment without an API token. Treat the list as founder-verified. |

Decisions taken in Phase 0 that this brief must respect:

- Workers plan stays Free. No Queues in Phase 1. Scheduled work, when it comes in Phase 2, uses a cron Worker on the free plan and writes to D1 directly.
- Google consent screen is in Testing mode. Only listed test users can complete Google OAuth. Cloudflare Access login for the founder is unaffected because that client is used by Access, not by our code.
- Meta Business Verification skipped. Clients join as Instagram Testers. Nothing in Phase 1 touches Meta.
- Theme decision is option 1: keep Trakyo light, add the Kendo-derived warm-dark theme, default the shell to dark.

## Founder actions Codex must request before starting task 1.2

Two things need the Cloudflare dashboard and are not Codex's to do:

1. Attach `ops.pulsify-ai.com` as a custom domain on the `pulsify-dashboard` Pages project.
2. Add an Access application "Pulsify operator dashboard" for `ops.pulsify-ai.com`, same Google identity provider, same policy allowing only `abod.louai@gmail.com`. Record its AUD tag in the registry.
3. On the Zero Trust identity providers page, run **Test** on the Google provider once, because it has never been exercised.

Codex posts the request in `AGENT_CHAT.md` and continues with 1.1 while waiting.

## Task 1.1. Enforce Access in the middleware (kills the pages.dev bypass)

- In `output/standard-preview/functions/_middleware.js`, for any request whose path starts with `/admin`, `/integrations`, `/settings`, `/campaigns`, or `/api/` routes that today accept `x-admin-key`, require a valid Access JWT **or** the existing admin key. Read the token from the `Cf-Access-Jwt-Assertion` header or the `CF_Authorization` cookie.
- Validate: RS256 signature against the JWKS at `https://pulsify-ai.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` equals the AUD tag in the registry (put it in `wrangler.toml` as a plain var `ACCESS_AUD`, it is not a secret), `iss` equals `https://pulsify-ai.cloudflareaccess.com`, `exp` in the future. Match `kid` against `public_certs`, cache the JWKS in memory for 10 minutes, never hardcode a key. Keys rotate every 6 weeks.
- On success set `context.data.operator = { email: payload.email, via: "access" }`. On admin-key success set `via: "key"`.
- If the request has no valid identity and the host is `pulsify-funnels.pages.dev`, redirect to the same path on `https://pulsify-ai.com` so the browser hits Access. Never render the console on pages.dev again.
- Replace the "paste the admin key" unlock screen with the Access flow. Keep the key path only for `tools/crm_sync.py` and automation callers, gated to `x-admin-key` on `/api/*`, and log every key use into `operator_events` so we can rotate it later.
- Tests: a JWT with wrong `aud` is rejected, expired is rejected, wrong issuer is rejected, valid one passes and exposes `email`, pages.dev host redirects, admin key still works for the sync tool. Add these to `tests/`.

## Task 1.2. Dashboard behind Access and moved into the shell

- Once `ops.pulsify-ai.com` exists, the dashboard is private by Access alone. Codex adds the same JWT validation to the dashboard's `functions/_middleware.js` (repo Ab-luiy/pulsify-dashboard, `functions/`) so direct calls to `/generate` and `/transcript` require identity too, and the `pulsify-dashboard.pages.dev` host redirects to `ops.pulsify-ai.com`.
- Do not redesign the dashboard interior in Phase 1. Wrap it: the dashboard loads inside the new shell as the "Pulsify" workspace's views, using the existing tab list (Overview, Metrics, CRM, Instagram, Content, Plan, Payments, Income, Payouts, Cash flow, Calendar, Health). Delete the 11-theme switcher and the alternate `index-*.html` files. Satoshi goes, Inter stays.

## Task 1.3. The shell (from the Kendo brief, Phase 1 mechanics)

Build once in `output/standard-preview/shared/shell.js` and `shell.css`, then mount the operator console, the portal, and the dashboard views in it. Exact specs, tokens, and measurements are in [[kendo-port-codex-brief]] sections 1.1 to 1.7 and 2.1. Non-negotiables:

- Sidebar 254 px with a 64 px collapsed rail, persisted. Header 52 px, sticky. State-based view switching at one URL per workspace, `?view=` deep links consumed on load, `document.title` per view.
- Workspace switcher at the top of the sidebar: **Pulsify** plus one row per client from `/api/clients`. Selecting a client calls the existing impersonation exchange (`functions/api/impersonate.js`) and opens the client workspace with a persistent banner "Viewing as {client}. Exit." Every switch is already audited in `operator_events`.
- Operator nav groups: top (Overview, Clients, Leads), Growth (CRM, Instagram, YouTube, Content), Delivery (Client work, Client brain, Acquisition pages, Email), Workspace (Integrations, Payments, Health, Settings).
- **Overview is the launcher.** A KPI strip from the existing `operator-overview` API, then a grid of cards, one per surface: each client portal, each live landing page (from `client_config`), each acquisition page, Lead Studio, Campaigns, Integrations, the dashboard views. Each card shows a status line and opens in one click. External links open in a new tab.
- One 150 ms fade-and-rise on every view mount. Global easing `cubic-bezier(.16,1,.3,1)` at 150 ms. Layout-matched skeletons, zero spinners. Bootstrap payload cached in localStorage under a versioned key.
- Dark theme tokens from the Kendo brief section 2.1 with Pulsify's green as `--primary`. Theme control (Light, Dark, System) on the Settings view, per device, no flash on load.

## Task 1.4. Login screens

- Client login at `/portal/login`: keep the auth exactly as is. Re-lay it out as the Kendo split panel: form left in a 448 px column, gradient panel right with one sentence of copy and no logos. Buttons and inputs from the shared tokens.
- "Operator sign in" links to `https://pulsify-ai.com/admin`, which Access now handles. No key field anywhere in the UI.

## Out of scope for Phase 1

Google OAuth for the portal (the redirect URI is not set yet), any Meta work, D1 migration of dashboard data, Queues, new integrations, the Studio interior, the Kendo Phase 2 components beyond tokens and the KPI strip.

## Verification before handing back

1. `curl -sI https://pulsify-funnels.pages.dev/admin` returns a 302 to pulsify-ai.com. `curl -sI https://pulsify-dashboard.pages.dev/` returns a 302 to ops.pulsify-ai.com. Both apex hosts return 302 to Access when anonymous.
2. All existing tests pass plus the new JWT tests. `node --test output/standard-preview/tests/*.test.mjs`.
3. Screenshots at 1536 and 390 wide, dark and light, for Overview, a client workspace under impersonation, the portal login, saved under `output/qa/2026-09-phase1/`.
4. Lighthouse on Overview above 90 for performance and accessibility in both themes.
5. Post files touched, AUD var added, and the two founder requests in `AGENT_CHAT.md`, update `IMPLEMENTATION-CHECKPOINT.md`, and log in `wiki/log.md`.

## Source trail

- Live probes 2026-09-17 (curl on all hosts, Access certs endpoint, Resend DNS).
- [[account-registry]] for AUD, client IDs, secret names.
- [[pulsify-command-center-architecture-2026-09-17]] Parts 3 and 7.
- [[kendo-port-codex-brief]] for every measurement and token.
- Cloudflare docs: Access JWT validation (header `Cf-Access-Jwt-Assertion`, cookie `CF_Authorization`, certs path, 6-week key rotation).
