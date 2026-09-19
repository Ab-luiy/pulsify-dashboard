---
type: synthesis
tags: [funnel, scaling]
sources: live probes of pulsify-ai.com and pulsify-sync on 2026-09-19, output/standard-preview at Pages c36e0873
created: 2026-09-19
updated: 2026-09-19
---

# Website audit, 2026-09-19: what is broken, what is sloppy, what Codex executes

Full pass over the console, the client portal, the onboarding page, the login, every API route and the live database, done the night everything shipped. Method: syntax check on every script (0 failures), the suite (77/77), an auth audit of all 82 routes against the middleware sets, anonymous probes of every API on production, a walk through every console and portal view in the browser with error capture, schema comparison between migrations and the live D1, and a scan for hardcoded hosts, dead pages and swallowed errors.

## Fixed during the audit (already live, Pages c36e0873)

1. Operator Settings said "unauthorized". `/api/account` and `/api/realtime-config` were not wrapped in `withOperator`, so the Access identity never reached them. Wrapped, tested, deployed.
2. Portal Home fired `/api/checklist` a dozen or more times per load (each call runs eight auto-complete queries). The launch card's fetch raced the DOM observer that triggers it. In-flight guard added.
3. Bell dropdown text fell back to a serif font because the panel lives outside the shell. Font stack added.

## Findings for Codex, ranked

Severity: P1 breaks a real flow, P2 wrong or wasteful, P3 sloppy.

| # | Sev | Where | What | Fix |
|---|---|---|---|---|
| 1 | P1 | `functions/onboard/[[path]].js` | `/onboard` returns a JSON 401 to an impersonated operator session, so the founder cannot preview onboarding as a client. Anonymous visitors also get raw JSON instead of the login page. | Allow impersonated sessions to load the page read-only (the page's own POSTs are already blocked server-side for impersonation); redirect anonymous GETs to `/portal/login?next=/onboard...` instead of returning JSON. |
| 2 | P1 | routing | Any unknown path (`/nope-slug-xyz`) returns 200 with the command-center landing page instead of a 404. Soft-404 on the whole domain; search engines and typos both land on the operator landing. | The `[slug]` function should 404 (with the brand 404 page) when the slug is not a known client landing. |
| 3 | P2 | `client.html` at `/client` | The never-deployed Atelier client design is publicly reachable at `/client` (200, "Client portal"). Dead page with its own scripts. | Delete `client.html` or 302 it to `/portal`. Same review for `optin.html` if it is superseded by `/{slug}` pages. |
| 4 | DONE | data | Two Frank workspaces: `frank` ("Frank Wieler", the old one) and `frank-wieler` (no client_name, the live landing slug). `multitest` is still present as "[deleted test]". `abdul-test-subject` too. All 8 rows are `status=prospect`, none `client`. | Done 2026-09-19 evening: `frank-wieler` kept and named, `frank`, `multitest`, `abdul-test-subject` archived (full JSON exports in R2 `archive/workspaces/` and `clients/_archive/`). |
| 5 | P2 | `shared/notifications.js` + portal | The bell issues four `/api/notifications` GETs within seconds of portal load (mount, realtime subscribe, visibility, and the shell re-mount). | Debounce `load()` to one call per 2 s window. |
| 6 | P2 | portal title | Document title reads "Loading workspace" until the dashboard resolves, then shows the client id (`frank-wieler`) instead of the client name, because `client_name` is null for that row and the fallback is the id. | Fallback to a humanised id ("Frank Wieler" from `frank-wieler`), and fix the data (#4). |
| 7 | P2 | `migrations/` | The live database has eight tables that exist in no migration file (`client_config`, `leads`, `crm_added`, `crm_overrides`, `crm_removed`, `asset_clicks`, `watch_events`, plus `d1_migrations`). Tests hand-create `client_config` with drifting column lists. | Write `0000_baseline.sql` from `wrangler d1 export --schema` so a fresh environment and the tests match production. |
| 8 | P2 | `/api/hooks/{provider}/{secret}` | An unknown path secret returns 200 `{"ok":true,"recorded":false,"reason":"unknown client"}`. Intentional to stop provider retries, but it also means a misconfigured webhook never surfaces. | Keep the 200, but write a `delivery_failures` row (kind `webhook_unknown_secret`) so it shows in Integrations. |
| 9 | P3 | console | Archive/restore exists as an API now (`/api/workspace-archive`, `functions/_shared/archive.js`: export every row to R2, status `archived`, page off, sessions killed, hidden from lists and login, nothing deleted). No console UI yet. | Add the button on the client card (Archive, with the export download) and an "Archived" filter with Restore. |
| 10 | P3 | `admin/phase1.js` | Native dashboard views (`crm`, `instagram`, `youtube`, `content`, `health`) leave the previous native view's DOM in `owned` (hidden). Harmless today, a memory and a11y smell. | Clear `owned` when switching to a dashboard view. |
| 11 | P3 | error handling | 40+ `catch (() => null)` / `catch {}` sites across the Worker jobs, `account.js`, `crm-sync.js`, `provisioning.js`, `payments.js`, `hooks.js`. Most are deliberate (never let a side effect break the caller) but none record anything. | Route them through `recordFailure()` with a kind, so silent failures show up in Integrations instead of vanishing. |
| 12 | P3 | notifications delivery | Two sessions were told opposite things about outside delivery (email vs Discord). `notify-operator.js` and `/api/notify` exist as a relay the bell session considers dead. | Ask the founder once; then either delete the relay or make it the only outside channel. |
| 13 | P3 | `admin/dashboard.html` | The legacy 150 KB single-file dashboard still ships and is reachable at `/admin/dashboard.html` behind Access. Native views now cover most of it. | Inventory which panels are still only there (Plan, Income, Payouts, Cash flow, Calendar, Health), then either port or keep, and stop shipping the rest. |
| 14 | P3 | `index.html` bare domain | `/` renders the command-center landing for everyone. Flagship QA had it rendering Frank; now it renders the operator landing to the public. | Decide what the bare domain is for (a public Pulsify page, or a redirect to `/portal/login`). |

## What was checked and is clean

- Every one of the 82 routes answers 401 or 403 anonymously except the deliberately public ones (landing pages, `funnel-config`, media by unguessable id, webhooks by path secret, login and lookup). No 5xx on any probe.
- No `pulsify-funnels.pages.dev` or `localhost` left in shipped code. No TODO/FIXME markers.
- Every migration table exists remotely; nothing missing.
- No JavaScript errors on any console view or portal view during the walk (Access session and impersonated session).
- Realtime channel carries ids and reasons only; publishable key only.
- Search: client scope filtered to own brain in the query filter, never DMs.

## Codex execution order

1. #1 and #2 (P1), same day, with tests: an impersonated GET on `/onboard` renders; anonymous GET redirects; unknown slug 404s.
2. #5, #6, #10 (small, self-contained).
3. #7 baseline migration, then #4 data cleanup once the founder answers which Frank.
4. #8, #11 together: one `recordFailure` sweep.
5. #3, #13, #14 as a "dead surface" cleanup with the founder's call on the bare domain.
6. #9 archive/delete workspace, with a test that proves cascade and that archived workspaces vanish from every list and API.
7. #12 after the founder settles email vs Discord.

Deploy from `output/standard-preview` only. Post each item's evidence in `AGENT_CHAT.md`.

## Connections

- [[phase5-review-and-polish-codex-brief]] — this audit is Part D of that brief
- [[flagship-qa-2026-07-02]] — earlier open items (bare domain, settings POST) revisited here

## Source trail

Probes and browser walks run 2026-09-19 evening against pulsify-ai.com (Pages deployments e4ac1029 and c36e0873) and pulsify-sync (Worker 2c486a9d); D1 `pulsify-portal` schema and `client_config` rows read via wrangler.
