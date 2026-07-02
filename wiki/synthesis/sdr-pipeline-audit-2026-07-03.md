---
type: synthesis
tags: [outreach, content, sales, scaling]
sources: pulsify-dashboard repo @ 241dff9 (tools/, functions/, index.html, .github/workflows/), portal-pipe schema in output/portal-pipe/
created: 2026-07-03
updated: 2026-07-03
---

# SDR pipeline audit (Fable pass, 2026-07-03)

Read-only audit of the full lead pipeline in `pulsify-dashboard` at commit `241dff9`: scrape (`tools/scrape_yt_leads.py`), enrichment (`tools/lead_scoring.py`), injection (`tools/inject_yt_leads.py`), the weekly GitHub Action (`.github/workflows/refresh-yt-leads.yml`), the Cloudflare functions (`functions/generate.js`, `functions/transcript.js`), the CRM layer inside `index.html`, and the portal-pipe D1 schema. Goal frame: the dashboard is meant to be an end-to-end AI SDR system — sources in, real validated enriched leads out, into one CRM. This page is the handoff brief for the fix work.

## Why this matters for Pulsify

Outbound is the bridge revenue tool while the content ecosystem compounds. The dashboard CRM is where that bridge lives. Right now its lead ranking is partly noise and 97% of its leads have no contact channel, which means the system produces motion, not outreach.

## Findings, worst first

**F1 — CRM score and tiers computed from the wrong field.** `tools/lead_scoring.py:115` reads `x.get("s")` as subscriber count. The scraper writes `s` as its composite scrape score (7,026–12,525 in current data). `_subs_score()` therefore returns 22 for anything under 10,000 and 30 above it — the largest weight in the 0-100 score is garbage. Root cause: `scrape_yt_leads.py` strips `_subs` before writing (line 544), so real subscriber counts never leave the scrape run. All 489 baked tiers (67 A / 279 B / 143 C) are suspect.

**F2 — near-zero contact coverage.** Of 489 leads baked into `index.html`: 14 have an IG handle, 0 have an email. Contact extraction is two regexes over the channel description (`IG_PATTERNS`). The `reach` component (+30 IG / +15 email) is lost uniformly by ~97% of leads, further skewing tiers. An SDR system with no contact channel per lead has nothing to send.

**F3 — scrape queries contradict the standing ICP.** The 2026-06-16 reframe (memory: `project_yt_lead_criteria`, `feedback_lead_queries_common_terms`): target creators who DO the craft, lead queries with immersed practitioner pain; coach/course phrasing surfaces gurus and produced dog-water leads. Live `QUERIES` are almost entirely `"day trading" course`, `"trading academy"`, `"for beginners"`, `"my students" trading`. The `CRAFT_PROOF` +600 nudge cannot rescue leads the search never returns.

**F4 — two divergent lead stores.** `yt_leads.json` on main holds 239 leads; the HTML has 489 baked in (the 250 recovered leads exist only inside `index.html`). Meta banner still reports 239. The weekly workflow merges scrape into the JSON while `inject_yt_leads.py` separately merges into the HTML. One `--replace` run, or the script-tag regex failing after a reskin, and the only complete store is gone.

**F5 — `/generate` and `/transcript` are unauthenticated with `Access-Control-Allow-Origin: *`.** Anyone can burn the Gemini/Anthropic quota (`max_tokens` taken from the body uncapped) or the paid Supadata credits.

**F6 — dead subs plumbing in the UI.** `basePros()` in `index.html` reads `l.sb`; no such field exists anywhere, so `subs` is always null and the Lead Studio "X subs" chip never renders. Same root cause as F1.

**F7 — inconsistent lead identity.** Scraper and injector dedupe by channel URL (`cu`); the CRM keys overrides, statuses, notes, profiles, and asset history by channel name (`n`). A rename orphans everything built on that lead. The static IG prospect list is never deduped against YT leads, so one person can carry two statuses.

**F8 — all pipeline state in one browser's localStorage** (`pulsify_crm_v1`). Statuses, notes, transcripts, creator profiles, generated assets — cleared site data or a new machine loses the working pipeline. The inbound side (portal-pipe) already has a durable D1 `leads` table; outbound and inbound are two disconnected CRMs.

**F9 — smaller.** `FOREIGN_HINT` includes `comment` (meant as French) and -4,000s English titles containing that word. `videoDuration: "medium"` caps search at 20 minutes, excluding the long-form coaches actually post. Channels without `country` (most) skip the Western gate. Weekly cron bot-commits `index.html` straight to main (the known stale-code auto-commit trap). Workflow failures alert nobody. Previously-merged leads keep stale enrichment forever.

## What holds

Merge-by-default protections (post lead-loss fix) work. `/generate` provider fallback is clean. Transcript ingest handles edge cases well. CRM UI (pagination, board/table, Lead Studio drawer, status migration) is in good shape.

## Fix plan

- **P0 — data honesty (1 session).** Persist real `subs` in the scrape schema; fix `lead_scoring.py` to score subs from subs; fix `basePros()` to read the new field; re-enrich all 489 baked leads. Make `yt_leads.json` the single source of truth: export the 489 from HTML back to JSON once, then injector reads JSON only. Fix meta count. Auth-gate both functions (shared header token, clamp `max_tokens`, CORS to the two pages domains).
- **P1 — top of funnel (1 session).** Rewrite `QUERIES` to immersed-pain ICP language per niche; keep a flagged "polished coach" set for comparison. Include long-form durations. Remove `comment` from `FOREIGN_HINT`. Add an exclusion list (clients, peers, known gurus) applied at scrape and inject.
- **P2 — validation + enrichment, the "real leads" layer (2-3 sessions).** Contact discovery per lead: parse all channel/branding links, expand Linktree/Beacons, scrape lead websites for email/contact, capture X/IG, verify IG handles resolve. Liveness checks (recent upload, subs re-check, dead/renamed flagged). Re-enrich ALL leads on every inject so scoring fixes propagate.
- **P3 — one durable CRM (2 sessions).** Move lead state out of localStorage into the portal-pipe D1 behind small `/leads` endpoints, keyed by channel URL; localStorage becomes a cache. Unifies outbound scraped leads with inbound funnel applicants — a scraped lead who later applies is one row.
- **P4 — observability (half session).** Workflow failure notifications plus a weekly data-lint asserting invariants (JSON count == baked count, no dupes, contact-coverage %, tier distribution).

## Connections

- [[flagship-qa-2026-07-02]] — same QA discipline applied to the funnels backend; F-numbering convention continues here
- [[landing-page-standard]] — Lead Studio's "Create live page" bridge is the send side these leads feed into

## Open questions / gaps

- Email discovery beyond website scraping (paid finders like Hunter) is unpriced; decide only if P2's free pass leaves coverage low.
- Whether the static IG prospect list in `dashboard-data-v2.json` is still a live source or legacy; affects the F7 dedupe.

## Source trail

All claims from direct reads of `pulsify-dashboard` @ `241dff9` and live data inspection (yt_leads.json parse, baked ytLeadsData parse: 489 leads, 14 IG, 0 email, s range 7026-12525), plus `output/portal-pipe/schema.sql` on brain main.
