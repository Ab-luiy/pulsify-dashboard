---
name: sdr-p0p1-shipped
description: "SDR pipeline P0+P1 live (2026-07-03) — real-subs tiers, canonical JSON, token-gated functions, pain queries; exclusions tag never delete; renovation waves queued"
metadata: 
  node_type: memory
  type: project
  originSessionId: f907bb42-8ad7-4bdb-a78c-800116c0a17e
---

2026-07-03: SDR pipeline P0+P1 from the audit ([[flagship-qa-2026-07-02]]-style pass, report at wiki/synthesis/sdr-pipeline-audit-2026-07-03.md) is SHIPPED and live-verified at pulsify-dashboard commit `40b52ce`. Codex built it headless (first real cross-call build, gpt-5.5 high), Claude ran the review round, one defect found and fixed (exclusion list deleted Frank's canonical record — rule: **denylists gate NEW ingestion, tag existing records `excluded:true`, never delete**), then Claude committed/pushed/deployed.

Facts that matter going forward:
- Tiers are now real: A 13 / B 120 / C 355 of 489 (old 67 A-tiers were ~80% noise from scoring the composite `s` as subs). 239/489 leads have subs=null (historically stripped) with neutral scoring — a re-scrape will gradually fill them.
- yt_leads.json is the single canonical lead store (JSON -> HTML one-way, idempotent injector). Never edit baked HTML data directly.
- `/generate` + `/transcript` require `X-FN-Access-Token` header == Cloudflare Pages secret `FN_ACCESS_TOKEN` (set 2026-07-03, value saved to Desktop/FN_ACCESS_TOKEN.txt for the user to paste into Lead Studio's new field then delete). CORS locked to the two pages domains; max_tokens capped 4096.
- pulsify-dashboard deploys via GitHub Actions on push to main (NOT git-integration): push = deploy; set Pages secrets BEFORE pushing.
- Build clone at Desktop/pulsify-dashboard-sdr-build (clean, == origin/main) reusable for the next wave.

USER-SIDE still: paste FN token into Lead Studio, set GEMINI_API_KEY, extend tools/exclusions.json.
NEXT: renovation waves per [[client-acquisition-renovation-2026-07-03]] (wiki/synthesis/client-acquisition-renovation-2026-07-03.md) — Wave 1 data spine (P2 contacts + P3 durable CRM + query provenance), Waves 2-3 dashboard/portal rebuilds gated on user sign-off of one mock screen each, Wave 4 sources+prompts.
