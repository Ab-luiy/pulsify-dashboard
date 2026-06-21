---
type: playbook
tags: [dashboard, analytics, kpis, hosting, infrastructure, crm, lead-scoring]
sources: [[wiki/synthesis/pulsify-90-day-plan]], [[wiki/playbooks/exam-mode-autonomous-ops]]
created: 2026-05-11
updated: 2026-05-29
---

# Pulsify dashboard workstream — scope and parking notes

The single-pane-of-glass dashboard for the entire Pulsify operation. Parked from active build per the 2026-05-10 ingest, but tracked as a critical workstream so it doesn't get forgotten. Scope expanded 2026-05-11 from "outreach and sales KPIs" to "every signal Pulsify produces, in one place."

> **Contradiction flag (2026-05-29):** the "parked" framing below is stale. The dashboard is no longer parked — a v4 single-file build (`.claude/worktrees/awesome-bassi-d88340/index.html`, ~309KB) is the live client-facing CRM pillar, deployed to `pulsify-dashboard.pages.dev` via `push-dashboard.bat`. Treat the parking notes as historical context; the active state is the dated build sections below.

## Why this matters for Pulsify

The founder runs solo against a 10/10 financial pressure clock with university time constraints. Right now, status checks require opening seven different surfaces: IG inbox, IG insights, YouTube Studio, Cal.com, Typeform, the local outreach tracker, the bank. Every context switch costs founder minutes. The dashboard collapses that into one screen. It also becomes the surface that exam-mode and autonomous-ops protocols read from — [[playbooks/exam-mode-autonomous-ops]] depends on the agent being able to check state without the founder.

This is infrastructure, not a vanity asset. It does not ship in Phase 1, but it cannot be allowed to slip out of memory.

## 2026-05-29 — Lead data layer enriched (built, verified)

The CRM tab ingests scraped YouTube leads. Two credibility bugs made it look like a toy instead of a sellable CRM, and both were **data-layer problems** — fixable at build time without touching the fragile 298KB UI:

1. **Dirty contact field.** The raw scrape's `ig` field often held an email/website (e.g. `someone@gmail.com`, `mysite.com`), not an IG handle. The UI rendered those verbatim as "@" handles.
2. **Fake score.** The lead "score" surfaced in the CRM was just the raw subscriber count (`l.s`) — e.g. "· score 13714" — not an actionability score. A real CRM scores leads; a subscriber count dressed as a score is the tell that this isn't one.

### What was built

- **`tools/lead_scoring.py`** (new shared module) — single source of truth for scoring/cleaning, mirroring the markdown CRM scorer (`outreach/score_leads.py` → `outreach/lead-crm.md`) so the dashboard and the markdown CRM agree. `enrich_leads(leads, scrape_date)` adds per lead, leaving raw scrape fields intact:
  - `ig` — cleaned IG handle (`""` if the scraped value was an email/domain)
  - `email` — the email/website fragment, when that's what `ig` actually held
  - `niche` — trading | ecom | tiktok shop | fba | operator | other
  - `score` — 0–100 actionability score (reachability × subs-sweet-spot × monetization-signal × niche × recency)
  - `tier` — A | B | C
  - `wound` — provisional five-wound diagnosis (confirm in research)
- **`tools/inject_yt_leads.py`** (edited) — now calls `enrich_leads()` on the parsed leads (passing `scrapedAt` from the meta file) before baking, and re-serializes with `json.dumps(..., ensure_ascii=False)`. The baked `<script id="ytLeadsData">` payload is now clean + scored. Still idempotent.
- **`index.html` `ytAsProspects()`** (lines ~4273–4292) — two surgical reads that feed **existing** render paths (zero new UI): `niche` now prefers the enriched `l.niche` (legacy regex kept only as fallback for un-enriched cached data), and `_ytScore` now reads the real `l.score` (falls back to `l.s` for legacy data). The existing "· score N" display (line ~4499) now shows a meaningful 0–100 number.

### Verified

Re-extracted the baked JSON from `index.html` after injection: 254 leads, every lead carries `ig/email/niche/score/tier/wound`, **zero** dirty `@`/TLD handles remain, tiers A=17 / B=106 / C=131, scores 40–100 (avg ~52). Injector exits 0; file 297KB → 309KB (the +12KB is the enrichment fields). Single `ytLeadsData` tag (no duplication). Not yet pushed to `pulsify-dashboard.pages.dev` — run `push-dashboard.bat` from the worktree to deploy.

## Roadmap — making the CRM client-sellable (next verifier-backed UI pass)

The data is now correct and the score is real. The remaining gap between "internal tool" and "product a client pays to see their own pipeline in" is **display** of the enrichment that already exists in the baked data.

**Update 2026-06-09 — items 1-3 shipped** in the canonical worktree `index.html`, DOM-verified against the live page (290 enriched leads: tier badges and wound lines on all 290 board cards, Tier A filter returns exactly 17, table renders 10/10 columns, zero console errors; full-page screenshot capture times out on the 400-card DOM, so verification was via DOM assertions):

1. ~~Tier badge on the lead card~~ — `tier`/`wound` now threaded through `ytAsProspects()` -> `basePros()`; colored A/B/C badge on board cards and a Tier column in the table (badge carries the score in its tooltip). Niche chip skipped — niche already renders in the card meta line.
2. ~~Filter by tier~~ — `crmTierFilter` select added next to the source filter. Bonus: "Pull next 15 -> Batch" now sorts the unworked pool by score descending, so each batch works the best leads first. CSV export now includes tier, score, and wound.
3. ~~Wound-aware next action~~ — the table's next-action column now shows the lead's actual `wound` (full text on hover) instead of the generic line; board cards show a truncated wound line. The priority-list heuristic itself was left untouched (separate render path, lower value now that wounds are visible everywhere).
4. **Contact-coverage honesty** (still open). The scrape has only a handful of usable IG handles and no emails — surface a "find the contact" count so the gap is visible, not hidden behind an empty handle column.

**Out of scope here (per memory):** a separate client-facing "client mode" is *deferred, not approved* — do not build it. IG profile aesthetic is parked — no bio/grid/highlight proposals. This roadmap is the operator-facing CRM getting good enough that a client *would* pay to see their pipeline in it; the client-mode product decision is the founder's, separately.

## Current state

- `dashboard.html` exists at vault root — a local HTML scaffold and v1 failsafe.
- `dashboard-data.json` exists at vault root — manually-updated JSON with outreach, sales, content, and phase fields.
- `dashboard-v2.html` exists at vault root as the live-ready version. `dashboard.html` remains untouched.
- `dashboard-data-v2.json` exists at vault root as the polling data source for v2. The page refreshes from this file every 15 seconds when served from localhost.
- `tools/dashboard-v2-server.ps1` and `tools/dashboard-v2-server.js` exist as local preview helpers. The PowerShell helper is the safer Windows path inside this vault.
- No real API integrations exist yet. V2 proves the data layer first: a connector can update `dashboard-data-v2.json`, and the dashboard updates without redesign.
- Marked parked in the 2026-05-10 log entry on the 90-day plan: "Outreach dashboard becomes a separate workstream after this plan ships."

## Full scope (when un-parked)

The dashboard is not just outreach. It is everything Pulsify generates a signal from.

### 1. Content surfaces

**YouTube:**
- Videos published (count, titles, dates).
- Per-video: views, watch time, retention curve, CTR, subs gained.
- Channel-level: total subs, 28-day views, top traffic source.
- Pipeline view: scripts in draft, scripts approved, recorded, editing, scheduled, published.

**Instagram:**
- Reels published (count, titles, dates).
- Per-reel: reach, plays, saves, shares, profile visits, follows from reel.
- Stories: daily frame count, sequence completion rate, reply rate, DM rate from stories.
- Static posts: reach, saves, comments.
- Profile-level: followers, profile visits, link clicks, DM volume.

**Cross-content:**
- Repurposing graph (one long-form → N reels → N shorts → N tweets).
- Pillar attribution per post.
- Hook-pattern performance tracking.

### 2. Outreach + sales

(This is what the existing `dashboard.html` was scoped for. Carry over.)

- DMs/Looms sent (today, this week, 30-day, all-time).
- Reply rate, positive reply rate.
- Calls booked, calls held, no-show rate.
- Proposals sent, closed.
- Cash collected (base + performance fee accrual).
- CPBC and time-per-close trending.
- Hit list state: total prospects, contacted, replied, in-thread, booked, closed, dead.

### 3. Funnel health

- VSL view rate, completion rate (once VSL is live).
- Typeform submission rate, completion rate per question.
- Cal.com booking conversion from Typeform.
- Pre-call email open + click rates.
- Show rate on calls.

### 4. Client delivery (when clients exist)

Per active client:
- Phase of [[playbooks/pulsify-delivery-sop]].
- Deliverables shipped vs. scheduled.
- Client-side KPIs (their YouTube/IG/sales numbers — the guarantee math).
- $100k-in-90-days progress bar.

### 5. Founder + operational

- 90-day plan phase + day counter (already in `dashboard-data.json`).
- Exam-mode state: green / queue / red per [[playbooks/exam-mode-autonomous-ops]].
- Open todos for founder vs. open todos for agent.
- Cash runway.

## Hosting and infrastructure (the open questions)

Founder flagged hosting/going-live as part of scope but unsure how. Decisions to make when un-parked:

- **Local vs. hosted.** Local-only HTML is fast but means founder must open the file on this machine. Hosted means accessible from phone, easier to glance at, but requires deployment + auth (private data).
- **Authentication.** This dashboard contains revenue, hit list, client data. Public hosting is unacceptable. Options: password-gated, Cloudflare Access in front of a static host, Tailscale-only access, or keep it local.
- **Data pipeline.** V2 makes `dashboard-data-v2.json` the first live adapter. Manual edits, exports, or connector scripts can write to that file now. Real solution pulls from: YouTube Data API, Instagram Graph API (requires creator/business account + Meta app), Cal.com API, Typeform API, the outreach tracker, VSL host analytics, and revenue source.
- **Refresh cadence.** True real-time is only useful for CRM changes, applications, and booked calls. YouTube, Instagram, VSL, and revenue can poll hourly or daily without losing decision quality.
- **Stack candidates.** Current path: static HTML + JSON + connector scripts/serverless functions. Keep Notion or a heavier app off the table until the JSON adapter stops being enough.

## Un-park trigger

Activate this workstream when **any one** of the following hits:

1. First paying client closes (delivery KPIs need tracking against the guarantee).
2. Outreach hits 100+ DMs sent and manual tracking starts dropping signal.
3. Three or more content surfaces are publishing weekly and per-post tracking by hand becomes unfeasible.
4. Phase 3 of the 90-day plan (Days 46–90) begins, by which point the volume on every surface should justify the build.

Whichever comes first.

## How Pulsify uses this (eventually)

Founder opens one URL once a day. Sees: where the 90-day plan stands, what shipped yesterday, where the leaks are, what the agent should be queued on, what cash is in. Decisions get made faster. The agent reads the same surface during exam-mode and triages the queue without bothering the founder.

## Connections

- [[synthesis/pulsify-90-day-plan]] — sets the phase and day counters the dashboard surfaces.
- [[playbooks/exam-mode-autonomous-ops]] — depends on the dashboard for autonomous state checks.
- [[playbooks/pulsify-delivery-sop]] — client-side KPIs feed the per-client view.
- [[playbooks/pulse-system-outreach]] — outreach KPIs feed the funnel section.
- [[playbooks/instagram-growth-workstream]] — IG content metrics feed the content section.

## Open questions / gaps

- Stack decision is partially made for v2: static HTML + live JSON first, API connectors second.
- Hosting and auth approach undecided.
- No real API integrations exist yet. Current v2 source is `dashboard-data-v2.json`.
- Instagram Graph API requires a Meta app + creator/business IG conversion; this is a multi-day task in itself.
- Hosted/private access is unresolved. Localhost is fine for now; public hosting without auth is unacceptable.

## Source trail

- Founder direction, 2026-05-10 (initial dashboard scope, marked parked in 90-day plan log).
- Founder direction, 2026-05-11 (expanded scope: YouTube + IG + outreach + sales + everything; hosting is in scope).
- Founder direction, 2026-05-16 (create separate v2 while keeping v1 as failsafe; make live updates possible).
- Existing artifacts: `dashboard.html`, `dashboard-data.json`, `dashboard-v2.html`, `dashboard-data-v2.json` at vault root; local helpers in `tools/`.
