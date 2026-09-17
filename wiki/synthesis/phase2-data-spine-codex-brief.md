---
type: synthesis
tags: [dashboard, infra, portal, integrations]
sources: [[wiki/synthesis/pulsify-command-center-architecture-2026-09-17]], [[wiki/synthesis/phase1-identity-shell-codex-brief]], [[wiki/synthesis/kendo-port-codex-brief]], pulsify-dashboard repo (dashboard-data-v2.json, tools/, .github/workflows/), output/standard-preview (functions/api/crm-sync.js, migrations/)
created: 2026-09-17
updated: 2026-09-17
---

# Phase 2 Codex brief: the data spine

Self-contained build brief for Codex. Phase 1 is live (funnels 0e14ef0d, dashboard main dc9a34c). This phase moves the operator dashboard off a 3.4 MB JSON file committed to a public GitHub repo and onto the same D1 database the portal uses, replaces the GitHub Actions cron jobs with one Cloudflare cron Worker, and mounts the dashboard views inside the Phase 1 shell instead of a new tab. No new accounts are needed. Workers stays on the Free plan: no Queues, cron plus direct D1 writes only.

Why this matters: every integration in Phase 3 onward writes time-series data per client. Today there is nowhere to put it. After this phase there is one place, one schema, one scheduler, and one read API, and the operator dashboard becomes the first consumer of it.

## Verified starting state

| Thing | Fact |
|---|---|
| `dashboard-data-v2.json` | 3,451,252 bytes. Top level: `lastUpdated`, `youtube` {channel, latestVideo, analytics, updatedAt}, `instagram` {profile, content, account, audience, cadence, reels, reelsSummary, posts, postsSummary, stories, storiesSummary, updatedAt}, `content` {igFollowers, igReach30d, igReelsShipped}. The dashboard fetches it directly with a cache-busting query. |
| `yt_leads.json` | List of 715 lead objects with 22 short keys (`s`, `n`, `cu`, `ig`, `vt`, `vu`, `pd`, `lt`, `ol`, `tv`, `tw`, `sq`, `email`, `niche`, `score`, `tier`, `wound`, `bigfish`, `x`, `discord`, `website`, `links`). `inject_yt_leads.py` bakes it into `index.html` and merges by default. |
| Refresh jobs | Three GitHub Actions: `refresh-channel-stats.yml` every 6 hours (`tools/refresh_channel_stats.py`, YouTube Data API key), `refresh-ig-analytics.yml` daily (`ig-report/agent.ts` via Composio, accumulates stories because they expire in 24 h), `refresh-yt-leads.yml` weekly Monday 06:00 UTC (`scrape_yt_leads.py` then `inject_yt_leads.py`). Each commits to `main` as `pulsify-bot`. |
| CRM state | Already in D1 on the funnels project through `/api/crm-sync` with tables `crm_overrides`, `crm_added`, `crm_removed`, merged per lead by `_ts`. This part is done and stays. |
| Other dashboard state | Health, payments, payouts, plan, calendar, and income are held in the page's own state. Their storage was not fully traced in review. Task 2.0 inventories them before any migration. |
| Secrets | `YT_API_KEY` and `COMPOSIO_API_KEY` exist only as GitHub Actions secrets today. They must be added as Worker secrets by the founder (names only in chat). |

## Task 2.0. Inventory before touching anything

Produce `output/standard-preview/PHASE2-INVENTORY.md` listing every piece of state the dashboard reads or writes: source (JSON file, localStorage key, D1 via crm-sync, in-page constant), shape, who writes it, how often, and whether it is per-operator or per-client. Include the health log, payments, payouts, plan, calendar, income, and the 90-day plan counters. Nothing in 2.2 starts until this file exists and the founder has seen it, because anything missed here is lost when the JSON stops being written.

## Task 2.1. Schema

Additive D1 migration `0025_data_spine.sql` on the `pulsify-portal` database. Never drop or rewrite existing tables. Tables:

- `metric_points (id INTEGER PK, scope TEXT NOT NULL, client_id TEXT NOT NULL DEFAULT '', source TEXT NOT NULL, metric TEXT NOT NULL, ts TEXT NOT NULL, value REAL, value_text TEXT, dims_json TEXT, UNIQUE(scope, client_id, source, metric, ts, dims_json))`. Every time-series number lives here: YouTube subscribers, views, reach, follower count, reel metrics per media id (media id goes in `dims_json`). `scope` is `operator` or `client`.
- `snapshots (scope, client_id, source, kind, captured_at, payload_json, PRIMARY KEY(scope, client_id, source, kind))`. The latest full object per source, for things that are not a number: latest video, profile, audience breakdown, cadence, reels list. This replaces the JSON blob one key at a time, and keeps the dashboard renderable on day one.
- `stories (scope, client_id, media_id PRIMARY KEY, captured_at, payload_json)`. Stories expire in 24 hours at the provider, so they accumulate here exactly as `agent.ts` accumulates them today.
- `yt_leads (id TEXT PRIMARY KEY, payload_json, score REAL, tier TEXT, niche TEXT, updated_at)` plus `yt_leads_meta (key PRIMARY KEY, value_json)`. The 22-key lead object goes in `payload_json` unchanged so `inject_yt_leads.py` logic ports without a rewrite. Denylists tag, never delete, per the standing rule.
- `operator_state (operator_email, key, value_json, updated_at, PRIMARY KEY(operator_email, key))` for health log, plan counters, calendar entries, payouts, and anything from 2.0 that is per-operator and not a metric.
- `sync_runs (id, job TEXT, started_at, finished_at, status, items INTEGER, error TEXT)`.

Indexes on `metric_points(scope, client_id, source, metric, ts)` and `snapshots(scope, client_id)`.

## Task 2.2. Read API on the funnels project

- `GET /api/spine/series?scope=&client=&source=&metric=&from=&to=&dims=` returns points for the shared date range. `GET /api/spine/snapshot?scope=&client=&source=&kind=`. `GET /api/spine/leads?tier=&niche=&q=&cursor=`. `GET /api/spine/state?key=` and `PUT` for `operator_state`. All behind the Phase 1 operator identity; client scope additionally honors the client session for that client only.
- A single `GET /api/operator-bootstrap` extension that includes the snapshots the Overview needs so the launcher paints in one request, matching the Kendo bootstrap-once rule.

## Task 2.3. The cron Worker

New Worker `pulsify-sync` in `output/standard-preview/workers/sync/` with its own `wrangler.toml` bound to the same D1 id `764a46f6-9f61-4f45-85b5-7e9a00e8be01` and the R2 bucket `pulsify-media`. Free plan.

- Cron `15 */6 * * *`: YouTube channel and latest video, ported from `refresh_channel_stats.py` to JavaScript, writing `metric_points` and `snapshots`.
- Cron `0 5 * * *`: Instagram, ported from `ig-report/agent.ts`. It already runs on Node and calls Composio over HTTP, so the port is mostly removing the file writes. Stories accumulate in `stories`.
- Cron `0 6 * * 1`: YouTube leads scrape, ported from `scrape_yt_leads.py`, writing `yt_leads` with merge semantics. Keep the pain-led query list exactly as it is. Respect the 10,000 unit daily quota and the 100 unit `search.list` cost; stop the job with a `sync_runs` error before the quota, never let it starve the channel refresh.
- Every run writes a `sync_runs` row. Failures alert through the existing Discord webhook path in `_shared/integrations.js`.
- Manual trigger: `POST /run/{job}` on the Worker, protected by the same Access JWT validation as Phase 1 (copy `access.js`), so the operator can press "Refresh now" in the shell.
- Idempotency: `metric_points` unique constraint plus `INSERT OR IGNORE`. Re-running a job never duplicates.

Founder asks for this task, names only: add `YT_API_KEY` and `COMPOSIO_API_KEY` as secrets on the new Worker. Codex posts the ask in `AGENT_CHAT.md` when the Worker exists.

## Task 2.4. One-time backfill

A script `workers/sync/backfill.mjs` that reads the current `dashboard-data-v2.json` and `yt_leads.json` from the dashboard repo and writes them into the new tables through the same insert functions the Worker uses. Run once against production after 2.1 is applied, report row counts per table in `AGENT_CHAT.md`. Then the JSON files stop being the source of truth. Do not delete them from the repo until 2.6 is verified; the GitHub Actions keep running in parallel for one week as a safety net, then get disabled by removing their schedules.

## Task 2.5. Dashboard reads from D1, inside the shell

- Replace the `fetch("dashboard-data-v2.json")` path in the dashboard with calls to the spine API through the Phase 1 same-origin proxy. Every view keeps its current layout; only the data source changes. Views render from cached snapshots first, then refresh.
- Mount the dashboard views inside the operator shell on `pulsify-ai.com/admin` as native views, not a new tab. The dashboard project keeps serving `ops.pulsify-ai.com` as a redirect to the corresponding view on the apex until Phase 3, then it is retired.
- Strip the dead theme CSS (Mirage, Obsidian, Voltage and the rest) and the `inject_yt_leads.py` bake step. Leads come from `/api/spine/leads`.
- Add a `DEV_ACCESS_BYPASS` env var check in the dashboard middleware so local development works again. Never gate on hostname alone.
- Every dashboard KPI uses the Phase 1 KPI grid component. Missing data shows the action that fills it, never a dash.

## Task 2.6. Verification before handing back

1. Row counts after backfill match the JSON: number of reels, posts, stories, leads, and the latest YouTube numbers, printed side by side.
2. Each cron job run manually once against production, `sync_runs` shows success, and the dashboard shows the fresh value within one refresh.
3. Three consecutive scheduled runs succeed with no duplicate rows (count before and after).
4. Dashboard views inside the shell render at 1536 and 390, dark and light, screenshots under `output/qa/2026-09-phase2/`.
5. Existing 21 funnels tests plus new spine API tests pass. Add tests for the unique constraint, the client-scope guard on the spine API, and the quota stop on the leads job.
6. Live checks: anonymous `/api/spine/series` returns 401, client session cannot read another client's scope, `ops.pulsify-ai.com/crm` redirects into the apex shell.
7. Post deployment IDs, Worker name, and counts in `AGENT_CHAT.md`, update `IMPLEMENTATION-CHECKPOINT.md` and `wiki/log.md`.

## Out of scope

New integrations, OAuth flows, outbound webhooks, the Push API, Queues, any client-facing data import. Those are Phase 3 and depend on this spine existing.

## Source trail

- `pulsify-dashboard` repo on 2026-09-17: `dashboard-data-v2.json` shape, `yt_leads.json` keys, `tools/refresh_channel_stats.py`, `ig-report/agent.ts`, the three workflow files.
- `output/standard-preview/functions/api/crm-sync.js` for the existing CRM tables.
- Cloudflare docs: Pages Functions cannot consume Queues or run cron; a separate Worker is required and can bind the same D1 and R2.
- [[pulsify-command-center-architecture-2026-09-17]] Part 3, "One data spine".
