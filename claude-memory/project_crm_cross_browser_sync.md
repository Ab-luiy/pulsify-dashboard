---
name: crm-cross-browser-sync
description: 2026-07-09 CRM lead state now syncs across browsers via pulsify-funnels D1 /api/crm-sync; agents read/write it with tools/crm_sync.py; needs ADMIN_KEY pasted once per browser
metadata: 
  node_type: memory
  type: project
  originSessionId: 441940b0-56f6-40bc-839e-160c6d74b4ee
---

Shipped 2026-07-09: the operator dashboard's per-lead state (`pulsify_crm_v1` — Lead Studio fields, pipeline status, transcripts, creator profiles, generated assets, removals) is no longer browser-only. Every edit stamps `_ts` and pushes (debounced) to `POST /api/crm-sync` on pulsify-funnels (D1 tables crm_overrides/crm_added/crm_removed, migration 0011, per-lead newest-`_ts`-wins merge, `since` delta pulls); the page adopts merged state on load, every 45s, and on tab-hide. Drawer fields also save while typing now (input debounce), not just on blur. Keyless browser = local-only as before ("Sync off" badge on the Outreach CRM header).

Dashboard commit a73f632 on pulsify-dashboard main; funnels deployed via wrangler --branch main same day.

How agents touch the same data locally: `python tools/crm_sync.py dump|leads|get|set|set-json` in the pulsify-dashboard repo, auth via FUNNELS_ADMIN_KEY env/.env (user holds the key — never guess it, see [[never-guess]]). Test/debug hook: localStorage `pulsify_crm_sync_url` overrides the endpoint (used with `wrangler pages dev` + local D1).

User-side step for each new browser: paste the funnels ADMIN_KEY once (Lead Studio -> Landing page block key field, localStorage `pulsify_funnels_admin_key` — same key the landing-page bridge uses).

Related: [[lead-studio]], [[operator-console]], [[deploy-pipeline]].

> ⚠️ **CORRECTED 2026-08-24: this sync does NOT work and never has.** `/api/crm-sync` was never built. `functions/` on origin/main holds only `generate.js` and `transcript.js`; POST to that path returns 405 (static asset), not 401. The client code in index.html calls an endpoint that does not exist. The admin key is also unobtainable: `ADMIN_KEY` on pulsify-funnels is Cloudflare `secret_text`, unreadable via API, and the founder does not know it, so "paste ADMIN_KEY once per browser" is dead-end advice. Related: `dashboard-data-v2.json` has no `crm` key, so `D.crm.prospects` is always empty and every non-YouTube lead lives ONLY in `localStorage.pulsify_crm_v1`. Workaround that works today: generate a console snippet that merges into that key directly (see `output/ig-pipeline-load.js`). Real fix specced as Change 0 in `CODEX_TASK_ig_pipeline_section.md`.
