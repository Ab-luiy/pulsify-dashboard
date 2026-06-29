---
name: project_crm_lead_loss_fix
description: CRM silently lost 250 leads to the overwrite-mode YT scrape on 2026-06-29; recovered to 489 and switched inject to merge-mode
metadata: 
  node_type: memory
  type: project
  originSessionId: a78945f3-7141-4eee-8017-78639f3ab603
---

On 2026-06-29 the weekly YT-leads refresh (`tools/inject_yt_leads.py`, commit 3ecd37c "Refresh YT leads: 239 entries") **rebuilt the CRM from a fresh scrape and silently dropped 250 of the prior 320 leads** (kept ~70, added 169 new → 239). The user noticed the count drop and a specific tracked lead missing ("Franz" = **Frank Wieler / @franz_wieler1**, ecom/dropshipping, tier B, wound=offer). Root cause was NOT any prompt/UI edit — `inject_yt_leads.py` overwrote the inline `<script id="ytLeadsData">` wholesale on every scrape, so any lead the new batch didn't re-surface vanished.

**Fixed 2026-06-30:**
1. **Recovered the data** — merged the pre-drop set (commit 3e5e7ff) back into the live dataset, deduped by channel URL: **240 → 489 leads** live (commit 5ea144f). Frank + all 250 dropped leads restored, 169 new kept.
2. **Stopped it recurring** — `inject_yt_leads.py` now **MERGES by default** (union fresh scrape with leads already baked in, keyed by `cu`/channel URL, fresh records win on conflict, prior leads never dropped); added `--replace` for a deliberate clean rebuild. Commit b3a3901.

**Why:** the operator actively tracks/builds assets for specific leads; silently losing one (and its localStorage asset history would orphan) is unacceptable. Lead asset work itself lives in browser localStorage, so it survived the data loss — only the lead cards were lost.

**How to apply:** lead data is embedded inline in index.html (`ytLeadsData`), not fetched — see [[project_yt_lead_criteria]] (must run inject after scraping). The scrape pipeline = `scrape_yt_leads.py` → `yt_leads.json` → `inject_yt_leads.py` (now merge-mode) → index.html. Deploy off a clean worktree based on origin/main of pulsify-dashboard, never the stale branches — see [[project_canonical_dashboard_worktree]], [[project_deploy_pipeline]]. If a future genuine cleanup is needed, run inject with `--replace`.
