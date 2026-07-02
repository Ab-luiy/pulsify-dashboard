---
type: synthesis
tags: [funnel, outreach, sales]
sources: code audit of output/standard-preview (worktree keen-tereshkova-bc3897) + live checks against pulsify-funnels.pages.dev
created: 2026-07-02
updated: 2026-07-02
---

# Flagship QA — funnel pipe, render pipeline, portal, provisioning

Deep QA pass over the deployed outreach system, run at the user's request while Fable 5 access lasts. Every finding below was verified in the actual code and, where marked, against the live production site. The standing rules at the bottom are the part meant to outlive this report.

## What passed

Stated plainly so nobody re-audits what already holds:

- Tenant isolation is real. A portal token decides the client server-side; a spoofed `?client=` is ignored (leads.js and client-data.js both use the same `resolveAccess`). Verified in code here and live on 2026-07-01.
- Portal tokens are 32 random bytes, stored hash-only, shown once, rotation kills the old link.
- Secrets are masked on read: `/api/settings` GET returns `kit_api_key_set: true`, never the value.
- All admin endpoints (`/api/settings`, `/api/campaigns`, `/api/client-data`, `/api/generate` POST, `/leads`) return 401 unauthenticated — live-verified today.
- `/migrations/`, `/.git`, `/.wrangler` are blocked by `_middleware.js` — live-verified 404.
- An unknown `?client=` renders generic defaults with zero leaked tokens or other clients' data — live-verified.
- Both templates are fully tokenized: no hardcoded Frank copy in `templates/canonical/` or `templates/variant-02/`. The provision-prompt twins (`functions/_shared/` and `js/`) are in sync.
- Admin key and portal token live in sessionStorage, not localStorage, on the funnels pages; the portal token is stripped from the URL bar via `history.replaceState`.
- Delivery-failure logging (`recordFailure`) is fail-soft and cannot break the live pipe.
- Escaping in the render pipeline is uniform (`& < > " '`) and correct for both attribute and text positions.

## Findings

> Status update, 2026-07-02 afternoon: F1, F2, and F3 were fixed by Codex in commit `5ceebc1` (merged to brain main, deployed to production) and independently verified by Claude the same day: bare domain renders "Private Application" with zero Frank references while `?client=frank` still serves his real copy; the static fallback and render Function contain no Frank remnants; `/api/settings` POST now preserves every omitted field (presence-based `keep()` helper). F4 remains an accepted, rule-bounded boundary, not a bug. The standing rules below are unchanged and permanent.

### F1 — the deployed source of truth lives in a disposable worktree (structural, fix first)

The complete production source (including `client-data.js`, `campaigns.html`, `api/generate.js`, the provisioning flow, migrations 0006–0007) exists only in the session worktree `.claude/worktrees/keen-tereshkova-bc3897/`, on an unmerged branch. The main vault checkout is missing all of the 2026-07-02 roadmap files. If that worktree is cleaned, the live site's source survives only as a Cloudflare deployment artifact. This is the same failure mode that already bit the dashboard repo (stale `awesome-bassi`) and the client portal (orphaned `wonderful-curran`).

Fix: merge that branch into vault main. Rule going forward is in the standing rules below.

### F2 — the bare domain serves Frank's private pitch to everyone (live-verified)

`https://pulsify-funnels.pages.dev/` with no `?client=` renders Frank's real case-study page — `functions/index.js` defaults `client` to `"frank"`, and the static fallback `index.html` (served if the Function ever errors) also carries Frank's copy hardcoded. Any prospect who trims their own link to the domain root sees another prospect's named pitch. The generic-defaults path already exists and works (unknown clients render "Private Application" — verified); the default just doesn't use it.

Fix: default the bare domain to the generic defaults (or a neutral Pulsify page), and re-generify the static fallback. One-line change plus one file; high trust impact.

### F3 — `/api/settings` POST is full-replace, not merge

Every save overwrites every non-secret column with the posted body; a field missing from the POST becomes NULL. Only `kit_api_key` and `typeform_webhook_secret` are preserve-if-absent. Any partial writer — the Lead Studio "Create live page" bridge is the live example — can silently wipe a client's saved `wistia_media_id`, `typeform_url`, `proof_images_json`, and `client_name`. The /settings UI is safe only because it happens to round-trip the full form.

Fix: preserve-if-absent semantics for all columns (the same `body.x || existing?.x` pattern already used for the two secrets). Until fixed: any caller must send the complete config, not a delta.

### F4 — `/event` with no webhook secret is an open write path (accepted risk, now bounded)

By design (outreach-volume decision, 2026-07-01), Typeform webhook secrets and Kit are off by default, and `/event` accepts unauthenticated posts for any configured client slug. Consequences of that trade: anyone who knows a slug can inject fake leads, pollute the analytics that /campaigns and the portal display, and — if Kit is configured without a webhook secret — subscribe arbitrary email addresses into the client's Kit account (a spam vector with the client's name on it).

This stays acceptable for low-stakes outreach pages only under the rule below: Kit on requires the webhook secret on. Analytics from this pipe are directional signals, not ground truth — a single spoofed watch event can mark a campaign "hot" on /campaigns (the signal uses MAX watch percent).

### F5 — smaller items

- `GET /api/generate` (and any GET to a POST-only API route) falls through to the static landing HTML with status 200. Not a security issue (POST is gated — live-verified 401), just untidy; an API path should never answer with a marketing page.
- Admin-key comparison is a plain `!==` (not constant-time). Theoretical timing exposure, negligible in practice behind Cloudflare; noted so nobody rediscovers it as a scare.
- The Lead Studio bridge (pulsify-dashboard repo) stores the funnels ADMIN_KEY in localStorage. An XSS on the dashboard would hand over funnels admin. Acceptable at current scale; becomes a real item when the dashboard is client-facing.
- `leads.js` selects all leads unbounded. Fine at current volume; add LIMIT/paging before any client has thousands of rows.
- `firstValue()` fuzzy-matches Typeform field refs by substring — a field ref like `business_name` would satisfy a lookup for `name`. Data-quality footgun to remember when building Typeforms; prefer exact refs `email`, `name`, `phone`, `revenue`, `situation`.

## Standing rules (the part that outlives the report)

1. **Deployed code lives on main.** Nothing deploys to production from a branch that is not merged to the vault's main (or the repo's origin/main). A session worktree is a workbench, not a home. This has now caused three incidents across two repos.
2. **The bare domain never names a prospect.** The no-param and error-fallback renders must be generic. Every prospect-specific render happens only behind their `?client=` link.
3. **Kit on = webhook secret on.** Never save a `kit_api_key` for a client whose `typeform_webhook_secret` is empty. The open `/event` path is acceptable for analytics; it is not acceptable as an unauthenticated door into a client's email list.
4. **Config writes are merges.** Any endpoint that updates `client_config` preserves fields absent from the request. Until F3 is fixed in code, every caller sends the full config.
5. **Funnel analytics are directional.** Watch percent, visits, and "hot" signals come from an unauthenticated pipe and can be spoofed. Use them to prioritize follow-up; never quote them to a client or prospect as verified numbers.
6. **API routes answer as APIs.** A method an endpoint doesn't support should 405, not fall through to page HTML.
7. **Every new endpoint ships with the four checks** run against production before it's called done: unauthenticated request is rejected; spoofed `?client=` under a portal token stays isolated; unknown client leaks nothing; secrets never appear in any response.

## Connections

- [[landing-page-standard]] — the render pipeline this QA covers
- [[funnel-portal-pipeline]] — the event pipe architecture
- [[outreach-to-client-pipeline-roadmap]] — where each phase stands

## Source trail

- Code: `.claude/worktrees/keen-tereshkova-bc3897/output/standard-preview/` (functions/event.js, leads.js, index.js, api/*.js, _middleware.js, js/funnel-integrations.js, js/provision-prompt.js, templates/)
- Live checks: pulsify-funnels.pages.dev, 2026-07-02 (auth gates, bare-domain render, unknown-client render, migrations block, generate GET/POST)
