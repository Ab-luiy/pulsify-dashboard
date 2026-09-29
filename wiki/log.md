# Wiki log

Append-only chronological record of all vault operations. Format: `## [YYYY-MM-DD] {operation} | {short title}`

---

## [2026-07-09] decision | Lead intel workflow locked for worked prospects

Added a persistent lead-intel workflow so every meaningful outreach prospect now lives in repo memory instead of only in chat. New home: `outreach/intel/` with one markdown file per worked lead plus a template and README. Each file stores the source notes, core leak, one personal detail to use lightly, assets built, current best DM/email, the last action taken, and the next recommended move. Also codified the operating rule at [[playbooks/lead-intel-workflow]]: if a lead is touched in a meaningful way, its intel file gets updated before the session ends. Added seed files for Grant Zuccolotto, GRT Trading, Deevestments, and Kyle Kirshner based on the work already completed. Copy-quality note locked too: when the founder wants stronger outbound, Codex should use Claude for the final copy pass and save the improved version back into the lead file.

## [2026-07-06] ingest | Cold DM formula codified (casual-peer, gift-first)

Codified the cold-DM voice the founder built and pressure-tested in a full iteration pass this session. Added [[content-engine/cold-dm-formula]]: five beats (casual opener, one genuine specific reference, soft opportunity-framed gap, the gift, ownership + soft reply-inviting close), a fill-the-brackets template, a real Frank Wieler worked example using his break-even/MRR take, the non-negotiable rules (lowercase casual, no em-dashes, reference in the middle not the opener, never name the gap as a flaw, abundance posture, drop the link but invite a reply, 30-45 words), and a 0-100 grading rubric. Flagged the contradiction with [[playbooks/pulse-system-outreach]] Step 4 (which bans casual openers and compliments) and resolved it: for cold DMs this new page is the standard as of 2026-07-06, the old diagnostic Format A is retired for DMs. Added a supersession pointer to the old playbook. Updated `index.md`. The purpose is repeatability — the founder vets and picks the lead, hands over the creator plus a transcript, and the DM auto-generates at a 95.

## [2026-07-02] client-update | Roadmap executed: provisioning, campaigns board, portal backends, hardening, Lead Studio bridge

Executed the buildable remainder of [[synthesis/outreach-to-client-pipeline-roadmap]] in one run (five Sonnet-built, individually verified builds, deployed live). Phase 1: "New prospect page" provisioning flow in /settings (paste creator brief, copy LLM prompt or one-click /api/generate, paste JSON, get sendable link) plus a Lead Studio bridge in the pulsify-dashboard repo (new "Landing page" asset type generates the token JSON from a lead's creator profile and creates the live page on pulsify-funnels via API). Phase 2: /campaigns board — every sent page with visits, watch %, applications, failure counts, and a follow-up signal. Phase 4 (partial): the client portal's Content, Calls, and Arsenal tabs now run on real D1 tables with operator editing in /portal; Pipeline stays honestly pending. Phase 5 (partial): delivery-failure logging on the Kit/webhook pipe, an /api/health endpoint, and [[playbooks/landing-page-launch-qa]]. Phase 3: [[playbooks/prospect-signed-onboarding]] written, untested until the first real signing. Migrations 0006/0007 applied to live D1; deployed to pulsify-funnels.pages.dev production and pulsify-dashboard main. Roadmap doc updated with new statuses. Still user-side: Wistia/Typeform/Kit accounts, an ADMIN_KEY click-test of the new authed UIs, and optionally a GEMINI_API_KEY on pulsify-funnels for one-click copy generation.

## [2026-07-01] ingest | Thumbnail photo cleanup prompt archive

Archived the exact 2026-07-01 image-editing workflow used for the founder's raw camera-photo thumbnails. Added `wiki/content-engine/thumbnail-photo-cleanup-prompts.md` covering four reusable prompt blocks: clean no-text thumbnail photo, yellow-bar title treatment, homepage hero extension, and tiny face cleanup + slightly closer crop. The page locks the principle that the face, money, mic, and room stay real while distractions get removed. Updated `index.md`.

## [2026-06-30] decision | Landing-page-first value sequence and live funnel library

Abdul set the client-acquisition motion: for qualified prospects with a weak
website or funnel, Pulsify sends a finished free landing-page design first, then
follows with a voice-matched VSL script, then a Typeform, then further useful
assets based on the next diagnosed leak. Follow-ups carry new work instead of
"just checking in." The sequence demonstrates the Funnel Stack before a sales
call.

Captured and studied four approved live references: Charlie Morgan's Imperium /
High Ticket Heaven page, Grant Garcia's The Reserve page, Luke Alexander's AI
Insiders page, and Ayman Arab's TikScale application page. Locked the design
hierarchy: Mason Bowstead remains the primary conversion and visual skeleton;
Luke supplies the AI-native layer for AI/technology prospects; Charlie, Grant,
and Ayman supply bounded structural mechanics. Created
`raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30.md` and
`wiki/synthesis/prospect-funnel-reference-library.md`; updated the VSL pattern
lab, Pulse System outreach playbook, wiki index, and shared Claude/Codex memory.

**Decision owner:** Abdul

---

## [2026-06-09] build | Dashboard CRM UI pass — tier badges, tier filter, wound-aware actions shipped

Shipped roadmap items 1-3 from `playbooks/pulsify-dashboard-workstream.md` in the canonical worktree `index.html` (commit `4bf9a4b` on `claude/awesome-bassi-d88340`). Tier/wound enrichment now threads through `ytAsProspects() -> basePros()`; A/B/C badges render on board cards and as a table column, a tier filter select sits next to the source filter, the next-action column shows each lead's real wound, "Pull next 15" sorts the unworked pool by score descending, and the CSV export carries tier/score/wound. Verified against the live page via DOM assertions (290/290 enriched leads badged, Tier A filter = 17, 10/10 table columns, zero console errors); full-page screenshot capture times out on the 400-card DOM. Item 4 (contact-coverage count) still open. Not yet deployed — `push-dashboard.bat` when ready. Updated the workstream page roadmap.

---

## [2026-06-09] build | Delivery system completed — prompt pack, intake + stack playbooks, client templates, bottleneck audit

Full renovation pass on service delivery and the prompt library, run while the founder was offline.

**Prompts created** (`raw-sources/prompts/`): `client-diagnosis-prompt` (Week 1 diagnosis doc + pre-sale discovery diagnosis), `client-vsl-writer-prompt` (6-step Haynes structure off the Brand Brain), `precall-email-sequence-prompt` (full hammer-them 12-18 email window + confirmation-page breakout list), `youtube-script-prompt` (Content Engine scripting subroutine), `sales-precall-brief-prompt` (Sales Co-pilot 5-line brief + qualification read + demo pick), `weekly-client-report-prompt` (Ops Replacement Monday report with $100k tracker), `_voice-guard` (shared final-pass module). Each embeds its source framework and ends with the same voice-guard pass.

**Prompt edits:** added the voice guard to `outreach-asset-prompt` and the mandatory financial qualification question to `landing-page-design-prompt-auto`'s form spec. Note: the 2026-06-01 entry chose to leave raw-sources prompts unmodified and enforce voice via CLAUDE.md; that holds only inside this repo's Claude Code sessions. These prompts get pasted into outside Claude/Perplexity contexts where CLAUDE.md never loads, so the guard now travels inside the prompt files themselves.

**Playbooks created:** `playbooks/brand-brain-intake.md` (7-section 90-min interview, build protocol, acceptance test — closes the gap named in the delivery SOP) and `playbooks/pulse-system-stack.md` (per-component tooling with proven / v1-manual / v2-automated tags, manual-first principle — closes the second named gap).

**Templates created:** `clients/_templates/` — README, welcome email, credentials checklist, week-1 diagnosis doc, weekly report, off-boarding pack (final-call agenda + final email + handover checklists; closes the third named gap).

**Audit:** `wiki/synthesis/business-bottleneck-audit-2026-06.md` — Day 30 position vs the 90-day plan (0 of 100 touches sent; warm-lead assets drafted 05-15 still unsent), the untracked-vault backup risk, stale operational surfaces, and the one-week priority order. Updated `index.md`.

**Decision owner:** agent (delivery artifacts), Abdul (everything in the audit's priority list).

---

## [2026-06-01] ingest | Humanizer tropes integrated as default copy voice

Ingested `Downloads/Humanizer AI Prompt.md` (AI writing tropes, sourced from tropes.fyi by ossama.is) and synchronized it into the system as the default voice. Cross-checked against existing writing governance: CLAUDE.md voice rules (already banned "it's worth noting," emojis, hedging, AI filler), `content-engine/packaging-rules` (titles/thumbnails only), and `raw-sources/prompts/outreach-asset-prompt` (positioning, not prose mechanics) — confirmed the tropes list fills a real gap at the sentence level. Created `wiki/content-engine/copy-voice-guide.md` as the canonical reference: the tropes filtered/adapted to Pulsify copy (DMs, VSLs, emails, pages, scripts), grouped by word choice / structure / format / tone, with a scope section (does NOT override the deliberate punchy title format), a "one is fine, ten is slop" deliberate-exception clause, and an 8-point pre-send checklist. Made it the default by extending CLAUDE.md "Voice rules" — broadened scope from "the wiki" to all shipped copy, folded in the top-frequency bans (negative parallelism, em-dash addiction, copula dodge, false suspense, bold-lead bullets, curly quotes/arrow glyphs, filler) and linked the full guide. Asset prompts in `raw-sources/` left unmodified (immutable); enforcement runs through CLAUDE.md, loaded every session. Updated `index.md`.

---

## [2026-05-29] build | Dashboard CRM lead data layer enriched + scored

Fixed the two bugs that made the dashboard's lead CRM look like a toy instead of a sellable product, both at the data layer so the fragile 298KB single-file UI didn't have to change. (1) New `tools/lead_scoring.py` in the canonical worktree (`.claude/worktrees/awesome-bassi-d88340/`) — shared `enrich_leads()` mirroring `outreach/score_leads.py`, adding cleaned `ig`, `email`, `niche`, 0–100 `score`, `tier` (A/B/C), and `wound` per lead. (2) `tools/inject_yt_leads.py` now enriches leads (using `scrapedAt` from meta) before baking into `<script id="ytLeadsData">`. (3) Surgical `index.html` `ytAsProspects()` edits feed existing render paths only: niche now prefers enriched `l.niche`, score now reads real `l.score` instead of raw subs. Verified: 254 leads, all enriched, zero dirty `@gmail.com`-style handles, tiers A=17/B=106/C=131, scores 40–100. Documented build + client-sellable roadmap (tier badges, sort/filter, wound-aware actions — all deferred to a screenshot-verified UI pass) on `playbooks/pulsify-dashboard-workstream.md`; flagged its stale "parked" framing inline. Not yet pushed live. Updated `index.md`.

---

## [2026-05-29] ingest | Pulsify content batch — 9 packaged title/thumbnail pairs

Generated `wiki/content-engine/pulsify-content-batch-2026-05.md` via the titles-thumbnails generator: 9 ready-to-shoot title+thumbnail pairs, 3 per pillar, full packaging (formula, source creator, thumbnail text/background/icon/expression/harmony, funnel position, CTA). Figures held honest — Nick's real $20k→$50k/mo arc, Pulsify's $5-12k price band, defensible VA-cost estimate; no fabricated client numbers. Includes suggested shoot order. Updated `index.md`.

---

## [2026-05-29] decision | Offer v2 risk-reversal proposal + lead CRM built

Two swings landed. (1) Outreach: scored the 276-lead `yt_leads.json` into `outreach/lead-crm.md` via new reusable `tools/score_leads.py` — tiered A/B/C on reachability × subs × monetization signal × niche × recency, with Today's-10 pre-staged (provisional wound + asset + drafted Format-A DM) and a find-the-contact list. Cleaned the dirty `ig` field (half were emails/domains). Updated `outreach/daily-review.md`, `outreach-log.md`, `hit-list.md`. (2) Offer: wrote `wiki/synthesis/offer-v2-risk-reversal.md` proposing the unbounded "$100k or free" guarantee be replaced with a system guarantee (default) + bounded/gated revenue guarantee + month-1 rev-share trial — credible in the trust recession, capped downside. Flagged on `playbooks/pulsify-offer-v1`, added to `index.md`. Founder decision pending.

---

## [2026-05-24] decision | Simplified outreach asset workflow — replaced intake command

Deprecated `lead-research-intake-command.md`. Previous approach was too heavy for cold prospects. New workflow: Abdul picks lead, spots the problem, pulls 3-5 transcripts, runs Perplexity extraction, pastes into `outreach-asset-prompt.md` with the problem and asset type specified. One prompt, one output. Added `raw-sources/prompts/outreach-asset-prompt.md` covering VSL, outreach DM, landing page copy, Loom script, and email — each with their own rules. Updated `index.md`.

---

## [2026-05-24] ingest | Lead research intake command — automated prompt pack generator

Added `raw-sources/prompts/lead-research-intake-command.md`. Single command where you fill in 6 fields (name, YouTube URL, Instagram handle, niche, audience size, known offer) and Claude outputs 5 fully pre-filled, sequenced prompts ready to paste: (1) Perplexity YouTube deep scrape, (2) Instagram manual scrape checklist, (3) sales funnel capture checklist, (4) Creator Profile synthesis prompt, (5) asset generation command. Nothing left as a placeholder. Ends with a one-line status summary of what is ready to run and what depends on earlier steps. Updated `index.md`.

---

## [2026-05-24] ingest | Prospect research SOP + synthesis prompt

Added `wiki/playbooks/prospect-research-sop.md` and `raw-sources/prompts/prospect-profile-synthesis-prompt.md`. The SOP is a 7-step process: qualify the prospect, scrape YouTube (calls the existing Perplexity VSL extraction prompt), scrape Instagram manually, scrape their sales funnel, pull any podcast appearances, synthesize into a Creator Profile via the synthesis prompt, then feed the profile into asset production. The synthesis prompt takes all raw scraped content and outputs a structured Creator Profile covering who they are, tone fingerprint (top 20-30 verbatim phrases), mechanism, avatar, proof stack, offer, content patterns, competitive positioning, and explicit gaps that would block asset production. Both files are linked to the existing VSL extraction prompt and landing page design prompt. Updated `index.md`.

---

## [2026-05-24] ingest | Landing page design prompt — automated context-aware version

Added `raw-sources/prompts/landing-page-design-prompt-auto.md`. Upgraded version of the base landing page design prompt. Eliminates manual placeholder filling — user pastes the client's overview.md into the context block and Claude auto-extracts niche, audience size, ICP, offer, unique mechanism, proof, and competitor reference before building the page. Audience-size logic, design rules, and conversion tweak output are all preserved. Updated `index.md`.

---

## [2026-05-24] ingest | Landing page design prompt — Claude structure pass

Added `raw-sources/prompts/landing-page-design-prompt.md`. Templatized Claude prompt for the structure and design pass of a high-ticket mentorship landing page. Covers hero, VSL slot, qualifying application form, CTA, testimonial wall, and closing CTA. Audience-size logic built in (large / mid / micro niche). Design rules enforce mobile-first, no lifestyle flexing, raw and authentic over flashy. VSL copy and all other copy are written in separate passes. Used as a landing page asset, offer asset, and outreach asset. Updated `index.md`.

---

## [2026-05-22] ingest | YouTube lead sourcing query bank + Claude Code script

Added `wiki/content-engine/youtube-lead-sourcing-query-bank.md`. Translates the 5 Pulsify title formulas into niche-specific YouTube search queries across 6 biz-op verticals: trading, dropshipping, Amazon FBA, Airbnb, TikTok Shop, and general biz-op. Includes ICP qualification criteria (7-signal checklist), per-channel read protocol, and API-formatted query dict for programmatic use. Companion Python script `youtube_lead_sourcer.py` saved to Projects/Pulsify — uses YouTube Data API v3 to search, filter by subscriber range (500–75K), score leads 0–10 on monetization signals, and export a ranked CSV. Updated `index.md`.

---

## [2026-05-19] ingest | VSL transcript extraction prompt — Perplexity workflow

Added `wiki/playbooks/vsl-transcript-extraction-prompt.md`. Reusable 8-category Perplexity prompt for extracting voice, mechanism, proof, avatar pain points, objections, story, differentiation, and content patterns from any creator's YouTube channel before VSL production. Developed after YouTube blocked direct transcript pulls for @TheAnomalyTrader. Also produced full VSL script draft for Philip's high-ticket 1-on-1 mentorship (`Pulsify-Brain/anomaly_trader_vsl.docx`) — framework complete, 6 Philip fill-ins required before filming. Updated `index.md`.

---

## [2026-05-17] decision | Dashboard v3 visual redesign — pending

Use Claude Design to redesign the layout of `dashboard-v3.html`. Goal: dramatically improve the visual polish and layout — premium, decluttered, million-dollar-grade. Current file is at vault root. No build started yet; this is a parked task to pick up next session.

---

## [2026-05-16] decision | Dashboard v2 live-ready file created

**What changed:**

Created a separate v2 dashboard path while keeping the original dashboard untouched as failsafe. V2 uses `dashboard-data-v2.json` as a live adapter: when served from localhost, the page polls the JSON every 15 seconds and updates the cards without a page refresh. The dashboard now includes a Live tab that names what can be live now, what should connect next, and what should stay lower cadence.

**Files created:**

- `dashboard-v2.html` - v2 dashboard with live JSON polling and source map.
- `dashboard-data-v2.json` - v2 data source copied from the current embedded dashboard state.
- `tools/dashboard-v2-server.js` - Node local preview helper.
- `tools/dashboard-v2-server.ps1` - PowerShell local preview helper for Windows.

**Files updated:**

- `wiki/playbooks/pulsify-dashboard-workstream.md` - current state, data-pipeline decision, refresh-cadence logic, and source trail updated.
- `wiki/index.md` - dashboard playbook summary and updated date refreshed.

**Decision:** Live dashboard first means local JSON polling, not direct platform APIs. Cal.com, Typeform, YouTube, and VSL analytics should connect before Instagram. Instagram is useful but slower because Meta app setup is heavier.

---

## [2026-05-16] client-update | IG inbox outreach audit + dashboard pipeline load

**What changed:**

Audited the full ab.luiy IG DM inbox via Chrome MCP. Finding: the entire outreach history is one Apr 14–15 2026 mass blast — ~100+ threads, identical 1:11 voice note + the same Loom link ("video we send our 6 figure clients", loom/share/1876406a...), zero personalization, ~4 prospect replies total. This directly violates [[playbooks/pulse-system-outreach]] (one observation + one custom asset per prospect, never the same opener twice).

- Exact @handles + stages resolved for the 16 engaged/peer/replied threads. Bulk dead-blast cohort logged by display name only (homogeneous, near-zero value for a value-asset-first restart) — full roster in `clients/_pipeline/ig-inbox-audit-2026-05-16.md`.
- Notable: Nicholas|Day Trader (@niicksfx) warm; Jonas Rorwick (@jonas.rorwick) warm inbound; Mason Bowstead (@masonibowstead) operator-peer intel; Rui Fu (@raycfu) runs an AI-course ManyChat funnel (funnel-hack study candidate).
- `dashboard.html` updated: outreach all-time 100 sent / 4 replies, pipeline 100 dm'd / 4 replied, hit list now renders live with a "do-not-re-spam, restart asset-first" banner, Phase-1 checklist "Hit list exported" marked done.
- Restart direction confirmed with operator: value-asset-first per Pulse System playbook.

## [2026-05-15] ingest | Iman Gadzhi funnel-hack capture v1

**What changed:**

First full creator capture under the funnel-hacks operation. Captured via Chrome MCP text/structure extraction (visual screenshots blocked by CDP renderer freeze — deferred to manual screenshot brief).

Key findings:
- Funnel topology: @imangadzhi (2.7M, no link) → @consulting (10.1K, only link) → consulting.com/andalusia-mastermind → Apply Now → /mastermind-call (application call booking) → close.
- Offer: Quantum Mastermind, $28,800, 60 seats, 3 days, Andalusia Sept 2026; recurring quarterly with rotating luxury locations (Dubai/Cape Town/London prior).
- No VSL, no opt-in, no email/SMS nurture, no webinar. Price shown upfront as the qualifier.
- No YouTube Shorts strategy at all. TikTok (539K) has no bio/link — pure reach.
- Fan clip economy (@imangadzhiclips 332K, @imangclips 89K) distributes him for free.
- Meta Ad Library: ~110 active "Iman Gadzhi" ads, all Hills Eyewear (his sunglasses brand). Zero paid ads for the coaching funnel. The $28,800 offer runs on $0 funnel ad spend.

Files written: overview.md, attention-layer.md, funnel-layer.md, content-breakdown.md, miro-board.md, screenshot-brief.md under wiki/funnel-hacks/creators/iman-gadzhi/. Index updated.

Open items: per-video hooks/thumbnails (needs manual screenshots + a few video opens), scheduler vendor on /mastermind-call (iframe didn't render through debugger tab), post-booking reminder sequence (requires booking a real call slot with the burner identity — flagged for user decision), IG Reels/Highlights deeper pass.

---

## [2026-05-15] ingest | Iman Gadzhi deep-dive — offer ladder + corrections

**What changed:**

Deeper pass on consulting.com. Mapped the full offer ladder (Monetise → UpLevel → Quantum → Masterminds; company trades internally as "Educate"). Captured Monetise (entry, cohort-gated, proprietary software stack: Synthesise/Flozy/GhostWriter OS/Shadow Operator Playbook) and Quantum (core high-ticket: 5 installed systems incl. "Negative Acquisition Flywheel," named C-suite Iman/Luis Berger/Max Schliebener/Ali Haider, claims of $70M+ at 97.15% margins and "$20M from one YouTube video").

Accuracy correction: revised the earlier "$0 funnel ad spend" claim. Precise version — current Quantum Mastermind funnel shows no active Meta ads (Ad Library), but Consulting.com states ~$2M historical ad spend vs $70M+ revenue (~35:1). Updated funnel-layer.md, overview.md, miro-board.md accordingly. Added two stronger YouTube angles built on their own "Negative Acquisition Flywheel" / "$20M from one video" framing.

Still open: UpLevel page, /mastermind-call scheduler vendor, IG @consulting 17 posts + Highlights content, the @consulting bio "1 more" link (IG modal wouldn't render via DOM or OS screenshot), per-video YouTube hook transcripts, manual screenshots.

---

## [2026-05-15] decision | Funnel hacks operation scaffolded

**What changed:**

User briefed full funnel-hacking project — reverse-engineer big-name biz-op coaches (Iman Gadzhi, Brez, Charlie Morgan, Shelby Sapp, TGR Trading, and others) end to end across the attention layer (YouTube long-form, shorts, IG, TikTok, clipping accounts, agencies, republishing, paid ads) and the conversion layer (link in bio, landing page, opt-in, email + SMS sequences, VSL, webinar, application, call booking, pricing reveal, sales call, DM closing, retargeting). Output is one folder per creator with screenshots, full breakdown, and a mermaid miro-board map of the A-to-Z journey.

Scaffolded:
- `wiki/funnel-hacks/README.md` — operation overview
- `wiki/funnel-hacks/capture-sop.md` — full step-by-step protocol
- `wiki/funnel-hacks/creator-template.md` — blank structure each capture copies
- `wiki/funnel-hacks/creators/` and `wiki/funnel-hacks/synthesis/` directories
- Index updated with new Funnel hacks section

Tone feedback also saved to memory: stop pushing back on strategic calls, deliver opinions humbly, treat user as operator and self as executing VA.

---

## [2026-05-15] ingest | Contract template v1 from Nick Furr + Jacob Thomas MSAs

**What changed:**

Founder shared three prior client contracts (one Nick Furr, two Jacob Thomas). Read all three. Both prior structures were profit-share-only with Stripe payment rails and generic funnel/GHL/ManyChat scope language — neither matches the v1 offer (base fee + performance + $100k guarantee + Turkey rails + Pulse System scope). Templatized into a single canonical agreement with placeholder tokens for find/replace before each send.

**Files created:**

- `wiki/playbooks/pulsify-contract-template-v1.md` — full templatized service agreement with: base fee + performance share (Section II), 90-day paid term + $100k guarantee + unbounded continuation (Section III), crypto/SWIFT payment rails replacing Stripe (Section V), client integration requirement (Section VI), Pulse System scope language (Section I), and IP split (client owns Brand Brain + agent, Pulsify owns templates and methodology).

**Files updated:**

- `wiki/playbooks/pulsify-offer-v1.md` — open-questions section: contract-template item closed, linked to new page; remaining open items on template called out.
- `wiki/index.md` — added the contract-template page under Playbooks; updated header date.

**Resolutions on prior contradictions:**

- Pricing in contracts: profit-share-only (Nick 25%, Jacob 20%) is superseded by base + performance from offer v1. New template enforces both.
- Payment rails in contracts: Stripe (both priors) superseded by crypto/SWIFT per founder constraints. Wise/Payoneer flagged as secondary, pending evaluation.
- Jurisdiction in contracts: Nick = USA, Jacob = UK/England and Wales. Template uses placeholder; UK is the cleaner default for a UK ltd company but founder confirmation pending.

**Memory updates:**

- Added `feedback_vsl_distinction.md` to the auto-memory: founder's personal go-to-market funnel (no VSL) is distinct from the Funnel Stack Pulsify installs for clients (still includes VSL). Recorded after a founder correction on this distinction during the same session.

**Pending:**

- Move the three source PDFs from `~/Downloads/` into `raw-sources/contracts/` for vault permanence.
- Founder confirms governing jurisdiction.
- Lock Pulsifymedia LTD signer name and title.
- Optional standalone NDA variant if it becomes a recurring ask.

---

## [2026-05-10] ingest | Pricing structure, guarantee, and 90-day plan

**What changed:**

Founder voice notes (2026-05-10) finalized the offer structure and the execution plan. Pricing rewritten from flat-tier to base + performance share with sales-call negotiation tree (default $5k + 30%, ladders to $7.5k or $10k under specific objections). Risk reversal locked at $100k-in-90-days guarantee with no time cap and no hour cap on continuation. Qualification gate moved from revenue-floor rule to discovery-call judgment with hard requirement that client integrate CRM and payment-processor visibility. Wrote three foundational pages and updated the offer page.

**Files updated:**

- `wiki/playbooks/pulsify-offer-v1.md` — full rewrite of pricing, performance-fee mechanics, attribution rule, qualification, disqualifiers, and risk reversal. Recorded-risk note added on the unbounded guarantee for future-revisit.

**Files created:**

- `wiki/playbooks/pulsify-funnel-v1.md` — Pulsify's own inbound funnel architecture, layer by layer, with build-order and tracking.
- `wiki/playbooks/pulsify-delivery-sop.md` — week-by-week client delivery protocol from contract signing to off-boarding.
- `wiki/synthesis/pulsify-90-day-plan.md` — sequenced May–August 2026 execution plan.
- `wiki/index.md` — added all 3 new pages.

**Resolutions on prior contradictions:**

- Pricing: flat $5–12k tiers replaced with base + performance negotiation tree.
- Risk reversal: 60-hour continuation cap removed by founder direction. Continuation is unbounded. Recorded risk filed in `pulsify-offer-v1.md` open-questions section.
- Disqualifiers: $30k/mo revenue floor and 1k follower floor removed. Discovery-call judgment governs. Hard requirement: full integration of CRM and payment processor.
- Dashboard: `dashboard.html` is parked. Outreach dashboard becomes a separate workstream after this plan ships.

**Pending:**

- Hit list export from founder's IG inbox.
- `wiki/playbooks/brand-brain-intake.md` — structured Week-1 intake questionnaire.
- `wiki/playbooks/pulse-system-stack.md` — exact technical stack per mechanism component.
- 12 competitor pages from `wiki/people/competitor-watchlist.md` once source material lands.
- Contract template draft.
- VSL recording (founder side).
- IG profile renovation.

---

## [2026-05-10] ingest | Founder interview — Pulsify operator layer

**What changed:**

Ingested founder interview voice note (2026-05-10) covering: founder bio + authority anchors, current business state ($0 MRR, 10/10 financial pressure), niche pick (trading-coach primary), offer structure ($5–12k, 90 days + 60-hour continuation cap), unique mechanism (The Pulse System with 5 components), exam-mode autonomy rules (3-lane queue protocol), KPI dashboard requirements, and 12 competitor handles for watchlist.

**Files created:**

- `wiki/people/abdullah-dagestani.md` — founder page with hard authority anchors and constraints
- `wiki/people/competitor-watchlist.md` — 12 handles, pending ingest, no characterization yet
- `wiki/concepts/pulse-system-mechanism.md` — the named mechanism, 5 components defined
- `wiki/playbooks/pulsify-offer-v1.md` — offer terms, pricing, week-by-week deliverables, risk reversal
- `wiki/playbooks/exam-mode-autonomous-ops.md` — green/queue/red autonomy protocol
- `dashboard.html` + `dashboard-data.json` — local KPI dashboard at vault root

**Files updated:**

- `wiki/index.md` — added all 5 new pages

**Resolutions on prior contradictions:**

- Risk reversal: "no risk reversal" + "we keep working until you get there" resolved as 90 days paid + 60 hours continuation cap with success-metric contract (see `pulsify-offer-v1.md`).
- Engagement length: "perpetual" resolved as 90 days paid with capped continuation, max 6 months.
- Niche: "biz-op" resolved as trading-coach primary with adjacent niche transfers tested per case.

**Pending:**

- `wiki/playbooks/pulsify-funnel-v1.md` — funnel-stack architecture (Pulsify's own funnel)
- `wiki/playbooks/pulsify-delivery-sop.md` — client-facing delivery SOP
- `wiki/synthesis/pulsify-90-day-plan.md` — the cash-in-45-days execution plan
- `wiki/playbooks/pulse-system-stack.md` — exact technical stack per mechanism component
- 12 competitor pages from `wiki/people/competitor-watchlist.md` once source material lands
- Hit list export from founder's IG inbox
- Contract template draft

---

## [2026-05-02] ingest | Full vault build from all raw-sources

**What changed:**

Read all 16 files in `raw-sources/` (including 6 compressed .txt files verified as duplicate content to their .md counterparts — no new information extracted from the duplicates). Built the complete wiki from scratch across all subfolders.

**Files created:**

*People:*
- `wiki/people/marcus-avatar.md` — Full 28-point ICP from the PULSIFY ICP PDF
- `wiki/people/alexei.md` — Micro niche YouTube framework, $58K/month from 4,500 subs
- `wiki/people/ayman-arab.md` — Three content types, searchability-first idea generation, packaging rules, tracking
- `wiki/people/jeremy-haynes.md` — Call funnel, VSL, webinar frameworks; Devon $100K→$400K/month result

*Concepts:*
- `wiki/concepts/profile-funnel.md` — ManyChat + trigger word + setter; default for Marcus-stage clients
- `wiki/concepts/unique-mechanism.md` — 4 properties, 6-step creation process, consequences of missing it
- `wiki/concepts/hammer-them-strategy.md` — Four quadrants, 6 emails/day, 48–72 hour window, 60–70%+ show rates
- `wiki/concepts/content-funnel-tof-mof-bof.md` — TOF/MOF/BOF layer mechanics, content ratios, bottleneck diagnostics
- `wiki/concepts/micro-niche-youtube.md` — 5-step framework, $800–$1,200/100 views, Rogers diffusion model
- `wiki/concepts/trust-recession.md` — 2025–2026 market condition; why lifestyle proof fails; raw production authority paradox
- `wiki/concepts/pulsify-order-of-operations.md` — Full 16-step sequence with phase breakdowns and deviation criteria

*Frameworks:*
- `wiki/frameworks/call-funnel-framework.md` — Financial modeling, CPBC, disposition tracking, hire-ahead principle
- `wiki/frameworks/vsl-framework.md` — 6-step VSL flow, affluent vs. general public differences, CAPI rules, Typeform+Calendly
- `wiki/frameworks/webinar-framework.md` — Live vs. evergreen, cold traffic principle, $5–$12 CPL, house money strategy

*Playbooks:*
- `wiki/playbooks/lead-sourcing-outreach.md` — 6 sourcing platforms, Day 1/3/5/7 sequence, Loom approach, setter training
- `wiki/playbooks/client-scaling.md` — Scale signal, price ladder, DWY transition, two scaling routes
- `wiki/playbooks/offer-creation.md` — Six-component offer architecture, high-ticket vs. mid-ticket criteria, audit checklist

*Content engine:*
- `wiki/content-engine/content-pillars.md` — Pulsify's three content categories, pillar definition process, weekly system
- `wiki/content-engine/packaging-rules.md` — Four-word title rule, face on camera, hook mechanics, editing by audience type

*Glossary:*
- `wiki/glossary/core-terms.md` — Definitions for all recurring terms (BOF, CAPI, disposition, hammer them, MOF, TOF, VSL, etc.)

*Navigation:*
- `wiki/index.md` — Full catalog of every wiki page with one-line summaries and raw source map
- `wiki/log.md` — This file

**Total files created:** 20 wiki pages + index + log = 22 files

---

## [2026-05-04] decision | Strategic correction — inbound content is primary revenue engine

**What changed:**

Abdul corrected a core strategic framing error present across three files. The previous claim — "outreach is the only activity that generates revenue" — misrepresented Pulsify's actual business model.

**Correct framing:** Inbound content (YouTube long-form) is the primary revenue engine. Prospects who arrive on a call having watched 3–5 videos are the warmest leads and the easiest closes. Outreach is a bridge mechanism that funds the operation while the content ecosystem compounds — not the long-term model.

**Files updated:**

1. `CLAUDE.md` — Core philosophy line corrected from "outreach is the only activity that generates revenue" to the inbound-first framing.
2. `wiki/playbooks/lead-sourcing-outreach.md` — Introduction, "Why this matters," and "How Pulsify uses this" sections all rewritten to reflect outreach as bridge, not engine.
3. `wiki/concepts/pulsify-order-of-operations.md` — Step 13 description updated to reflect that by this phase, inbound content should be the primary lead source.

**Decision owner:** Abdul (operator)

---

## [2026-05-10] decision | Miro Proof Board v1 named

**Decision:** The approved AI content workflow thumbnail design is named **Miro Proof Board v1**.

**Why:** The name captures the two core signals: a Miro-style workflow board and visual proof of the AI/content system. It is specific enough to reuse for future thumbnails without sounding generic.

**Files updated:**

- `wiki/content-engine/ai-content-workflow-thumbnail-profile.md` - renamed page title and added alias.
- `wiki/index.md` - updated the thumbnail profile summary with the new name.

**Contradictions flagged during ingest:**

1. `wiki/concepts/profile-funnel.md` and `wiki/playbooks/lead-sourcing-outreach.md` — Lead Sourcing SOP instructs Pulsify's own outreach operators to post lifestyle content (cars, status symbols) as Instagram story content. Contradicts Pulsify's core anti-lifestyle positioning. Flagged inline in both pages.

2. `wiki/people/alexei.md` and `wiki/people/ayman-arab.md` — Alexei says "give the wow not the how" (do not over-educate TOF viewers). Ayman Arab says "give almost everything in the free course." Resolution: Alexei's rule governs TOF videos; Ayman's rule governs the free course (a specific MOF/BOF piece). Both are correct in context. Flagged inline.

**Gaps identified during ingest:**

- Client Onboarding SOP (`raw-sources/sops/Client Onboarding SOP.pdf`) contains only a Google Forms link — no extractable content. The [[pulsify-order-of-operations]] page is currently the most complete onboarding documentation in the vault.
- "Niksetting's Appointment Setting SOP" referenced in profile-funnel but not present in raw-sources.
- Exact ManyChat automation sequence (messages, qualification questions, handoff trigger) not documented anywhere in raw-sources.
- CAPI technical implementation (Zapier/Make setup) not documented.
- No Pulsify-specific client data exists yet — all frameworks are sourced from external coaches (Alexei, Ayman, Jeremy). First client results should be filed in `clients/` and referenced in relevant wiki pages.

---

## [2026-05-06] decision | Marcus avatar broadened — five wounds, not one

**What changed:**

Abdul corrected a framing error in the Marcus avatar. The previous version treated the second-launch flop as the gravitational center of Marcus's psychology. In reality the launch plateau is one of several entry wounds Marcus can walk in with — and not the most common across the broader prospect pool.

**New framing:** Marcus arrives with one or more of five parallel wounds — (1) content stall, (2) lead-flow stall, (3) program stall, (4) backend stall, (5) sales-infrastructure stall — plus the legacy launch-plateau path as a sixth, narratively rich but not universal entry point. Pulsify must speak to all of them and diagnose on the call.

**Files updated:**

1. `wiki/people/marcus-avatar.md`
   - Frontmatter: `updated: 2026-05-06`
   - "Why this matters for Pulsify" section rewritten to drop the implicit launch-plateau lens
   - New "The five wounds Marcus can walk in with" section added directly under "Why this matters"
   - "The story" relabeled as "The story (one common version of it)" with closing paragraph noting other entry paths
   - Section 2 (Obstacles/problems) restructured into five wound buckets plus a cross-cutting set, replacing the flat list
   - Section 4 (Doubts) expanded with non-launch-specific doubts (offer is the problem, bad on camera, AI velocity)
   - Section 6 (Fears) expanded with the cross-wound collapse fear and the AI-lapping fear
   - "What Marcus needs to see" and "What to say on the call" both updated to require diagnosis of which wound is actually his before presenting any module

**Decision owner:** Abdul (operator)

**Strategic notes from same conversation (not yet filed as wiki pages):**

- v1 of the AI backend infrastructure will be the **Pulse Engine** — content module of a larger umbrella to be named.
- Mechanism naming workshop active. Top candidates: **The Pulse System** (Pulse Engine + Pulse Brain + Pulse Loop), **The Authority Stack**, **The AI-Native Coach**, **The Operator's Stack**, **The Backstage System**.
- Outreach prompt system delivered (8 modular prompts: Day 1 cold, Day 3/5/7 chain, Loom, audit DM, video breakdown DM, case study DM, re-engage, no-show rebook).
- Next 7 YouTube concepts approved direction: TOF cluster around AI-for-coaches/info-offers, friend-sharing tone, all built around the Pulse Engine demo.

**Follow-ups required:**

- Once Pulse System name is locked, create `wiki/concepts/pulse-system.md` and start its source trail.
- File the outreach prompt set into `wiki/playbooks/` as a new `outreach-prompt-system.md` page so it lives in the vault, not just chat.
- After videos 2 and 3 publish, document what worked into `wiki/content-engine/` to start building Pulsify's own first-party packaging data.

---

## [2026-05-06] ingest | Grant Garcia AI outreach framework + 9-prompt launch pack

**What changed:**

Two new files dropped into `raw-sources/scripts/`:
1. `AI-Outreach-Framework-Grant-Garcia.md` — Grant Garcia's 6-step "build before you DM" AI outreach system. Source proof: Sire Abram $400K/5 days, students Aiden $24K, Sammy $10K/day, Gus $235K/4 days.
2. `AI-Launch-Prompt-Pack-Grant-Garcia.md` — 9-prompt complete launch pack (offer creation → VSL scripting → landing page → Typeform → automations → pre-call assets → sales team training → story sequences → testing). Includes two reference VSL transcripts (Sire Abram's Vantage Education + Grant's own Reserve VSL).

**Files created:**

- `wiki/playbooks/ai-outreach-grant-method.md` — synthesis of the 6-step outreach system
- `wiki/frameworks/ai-launch-prompt-pack.md` — synthesis of the 9-prompt launch pack
- `wiki/playbooks/pulse-system-outreach.md` — Pulsify's voiced playbook fusing Grant's method with The Pulse System mechanism and the Marcus five-wound diagnostic. This is the active outreach SOP starting today.

**Files updated:**

- `wiki/people/marcus-avatar.md` — Connections section expanded with links to pulse-system-outreach (the diagnostic playbook) and ai-outreach-grant-method (source method).
- `wiki/playbooks/lead-sourcing-outreach.md` — Connections section expanded; flagged that pulse-system-outreach supersedes the default sourcing motion described in the original SOP.
- `wiki/index.md` — Added 3 new wiki pages (1 framework, 2 playbooks) + 2 raw-source entries; updated date.

**Key strategic implications captured in the new pages:**

- The asset built in the DM IS the Pulse System demo. Outreach and proof-of-mechanism collapse into one motion.
- The five-wound diagnostic from the updated Marcus avatar maps cleanly onto five distinct asset types — operator picks one wound, builds one asset, doesn't ship a "full audit."
- Tools stack runs under $80/mo (Claude $20 + Lovable + Poppy + Sheets), validating the "AI infrastructure under $20–$80/mo" content angle for upcoming videos.
- Rev-share framing ("lose 20% margin for one month") destroys the Marcus "trash operator" objection on the call.
- The 9-prompt launch pack also functions as the post-signing client launch SOP — compresses 30–60 day onboarding into ~12 days, which is the operational claim Pulse Brain makes.

**Source name discrepancy flagged:**

The outreach framework header reads "Grant Wantgarcia." The actual operator is Grant Garcia (per existing wiki references in [[content-engine/packaging-rules]]). All wiki pages standardize on Grant Garcia.

**Decision owner:** Abdul (operator)

**Mechanism naming locked:**

Same conversation: **The Pulse System** is the locked umbrella mechanism name. Modules: Pulse Engine (content) → Pulse Brain (sales/leads) → Pulse Loop (hammer-them retargeting). v1 module being built first: **Pulse Engine.** When the dedicated `wiki/concepts/pulse-system.md` page is created, all forward references in the new pages will resolve.

---

## [2026-05-07] decision | Strategic pivot — client acquisition only, backend paused

**Decision:** All focus shifts to client acquisition. Backend (Pulse System build-out) is paused until a paying client exists to build it with/for.

**Two acquisition channels:**
1. **Outbound** — IG DMs, asset-first method (show don't tell). Voice note method was tested and dropped. Active playbook: [[playbooks/pulse-system-outreach]].
2. **Inbound** — YouTube, demonstrating AI applied to info offers (traffic, conversions, backend). Content is secondary to outreach right now.

**Close structure:** 5-day upfront setup fee.

**Decision owner:** Abdul (operator)

---

## [2026-05-07] decision | Copywriting skill — priority task

**Task:** Build a Cowork skill that emulates the world's best copywriters. References to pull from: Ben Bader emails, other elite copywriters. Instructions must include: do not sound like AI, [additional rules to be defined when skill is built]. Skill should generate copy in the voice/style of specified copywriter references.

**Priority:** High — needed for DM copy, VSL scripts, email sequences, landing pages.

**Status:** Built 2026-05-08. Skill file at `copywriting.skill` in Pulsify-Brain folder. Three modes: Email (Ben Bader), VSL (Luke Alexander), IG/LinkedIn ghostwriting. Install by double-clicking the .skill file in Cowork.

---

## [2026-05-09] decision | VSL transcript pattern lab created

**What changed:**

Abdul clarified the immediate purpose of the vault work: transcribe downloaded VSLs, collect more VSL transcripts, extract recurring persuasion patterns, and adapt those patterns into Pulsify's own persona instead of copying surface language.

**Files created:**

- `wiki/synthesis/vsl-pattern-lab.md` - workflow for raw transcript capture, VSL segmentation, pattern extraction, Marcus mapping, and reusable pattern cards.

**Files updated:**

- `wiki/index.md` - added the existing Pulsify and Evan VSL drafts to the content-engine section and added the new synthesis page.

**Operational note:**

No audio or video transcription tools are currently installed in the local workspace. VSLs need to be transcribed externally first, or local transcription tooling needs to be added before the vault can process downloaded video/audio directly.

---

## [2026-05-09] decision | Claude-Codex harmony and VSL intake structure

**What changed:**

Abdul clarified that Claude is the main LLM, while Codex should help structure the Obsidian vault without disrupting Claude's workflow. The goal is a tag-team system: both models use the same vault context, preserve source integrity, and avoid competing versions of Pulsify strategy.

**Files created:**

- `raw-sources/vsls/README.md` - transcript intake rules for VSLs Abdul transcribes manually.
- `wiki/synthesis/vsl-patterns/README.md` - reusable VSL analysis template.
- `wiki/playbooks/claude-codex-collaboration.md` - operating protocol for Claude and Codex working from the same vault.
- `wiki/content-engine/next-video-sales-funnel-automation.md` - initial strategic note for the next video on AI-built sales and funnel automation.

**Files updated:**

- `wiki/index.md` - added the new collaboration, VSL pattern, and next-video pages.

**Strategic note:**

Current order of focus: build the VSL pattern library, sharpen Pulsify's own VSL, prepare the next sales/funnel automation video, document the AI system architecture, then return to outreach with stronger assets.

---

## [2026-05-09] ingest | Imperium Agency VSL transcript stored

**What changed:**

Created the first raw VSL transcript source from Abdul's TurboScribe PDF export. This becomes the canonical transcript for Imperium Agency / Charlie Morgan VSL pattern analysis.

**Files created:**

- `raw-sources/vsls/imperium-agency-vsl-transcript.md` - cleaned transcript with frontmatter, TurboScribe header/footer removed, and obvious transcript corrections applied.

**Files updated:**

- `wiki/index.md` - added the new VSL transcript to the raw source map.

**Known transcript note:**

One phrase remains uncertain: "the average yourself" near the CTA section. It should be checked against the audio before quoting or using for exact language. For structure and pattern extraction, the transcript is usable.

---

## [2026-05-09] ingest | Operator VSL study pack filtered into the vault

**What changed:**

Abdul approved external operator/VSL sources for vault use, then clarified the filter: beneficial only as pattern intelligence, harmful as strategy soup. The ingest therefore separates core operators from peripheral references and stores each source with a strict use boundary.

**Files created:**

- `raw-sources/inspiration/vsl-operator-study-source-list.md` - approved external source registry for Daniel Fazio, Serge Gatari, Jordan Platten, Charlie Morgan, Jeremy Haynes, and secondary operators.
- `wiki/people/daniel-fazio.md` - agency offer packaging, staged scaling, and VSL/call funnel source page.
- `wiki/people/serge-gatari.md` - AI infrastructure positioning source page.
- `wiki/people/jordan-platten.md` - founder bottleneck and agency systems source page.
- `wiki/synthesis/operator-vsl-study-map.md` - core vs. peripheral study map and Pulsify adaptation filter.
- `wiki/synthesis/ai-infrastructure-positioning-patterns.md` - how Pulsify should frame AI as implementation compression and installed revenue infrastructure.
- `wiki/frameworks/agency-scaling-vsl-architecture.md` - reusable architecture for stage-specific agency/coaching VSLs.
- `wiki/synthesis/peripheral-operator-reference-map.md` - limited-use reference map for Cole Gordon, Ayman Arab, Grayson Loupas, Dan Bolton, Joel Kaplan, Abdoulaye Waly, and Sam Ovens.

**Files updated:**

- `wiki/index.md` - added new people, framework, synthesis, and raw source entries.
- `wiki/synthesis/vsl-pattern-lab.md` - updated current source-library status and linked the new operator study map.

**Strategic note:**

Core study cluster is Charlie Morgan + Daniel Fazio + Serge Gatari + Jordan Platten + Jeremy Haynes. Secondary operators are not strategic anchors. They are pulled only for specific layers: sales team, YouTube sales funnel, social funnel contrast, simple organic authority, ethical operator framing, current market language, or legacy consulting VSL structure.

---

## [2026-05-10] ingest | Transcript-derived VSL pattern analysis batch one

**What changed:**

Captured the first transcript-derived pattern batch from public sources without storing full third-party transcripts. The ingest separates raw user-provided transcript material from external transcript-derived notes. Charlie's local Imperium transcript was analyzed directly. Daniel, Serge, Jordan, and Jeremy were ingested as paraphrased source notes and synthesis because their full third-party transcripts/pages should not be reproduced verbatim in the vault.

**Files created:**

- `raw-sources/inspiration/daniel-fazio-get-clients-challenge-transcript-notes.md` - transcript-derived notes from Daniel Fazio's Get Clients Challenge VSL.
- `raw-sources/inspiration/serge-gatari-ai-infrastructure-transcript-notes.md` - transcript-derived notes from Serge Gatari's AI infrastructure video.
- `raw-sources/inspiration/jordan-platten-agencies-dying-interview-notes.md` - transcript-derived notes from Jordan Platten's 2025 agency interview.
- `raw-sources/inspiration/jeremy-haynes-inner-circle-page-notes.md` - public page notes from Jeremy Haynes' Inner Circle application page.
- `wiki/synthesis/vsl-patterns/imperium-agency-vsl-analysis.md` - analysis of Charlie Morgan's Imperium Agency VSL.
- `wiki/synthesis/vsl-patterns/daniel-fazio-get-clients-challenge-analysis.md` - analysis of Daniel's five-day challenge VSL structure.
- `wiki/synthesis/vsl-patterns/serge-gatari-ai-infrastructure-vsl-analysis.md` - analysis of Serge's AI infrastructure and process-selling VSL pattern.
- `wiki/synthesis/jordan-platten-agency-systems-patterns.md` - extraction of Jordan's retention, communication, expectation-setting, and stage-map patterns.
- `wiki/synthesis/jeremy-haynes-inner-circle-page-analysis.md` - analysis of Jeremy's Inner Circle page wrapper, email gate, scarcity, and disclaimer posture.
- `wiki/synthesis/personalized-cold-outreach-vsl-architecture.md` - reusable Pulsify architecture for diagnostic personalized cold outreach VSLs.

**Files updated:**

- `wiki/index.md` - added new source notes and synthesis pages.
- `wiki/synthesis/vsl-pattern-lab.md` - updated current source library and copyright-safe transcript handling.
- `wiki/synthesis/operator-vsl-study-map.md` - added transcript-backed pattern table.
- `wiki/synthesis/ai-infrastructure-positioning-patterns.md` - added Serge's process-selling VSL application.
- `wiki/frameworks/agency-scaling-vsl-architecture.md` - added transcript-backed refinements.
- `wiki/people/daniel-fazio.md` - linked Daniel's transcript-derived VSL analysis.
- `wiki/people/serge-gatari.md` - linked Serge's transcript-derived VSL analysis.
- `wiki/people/jordan-platten.md` - linked Jordan's transcript-derived agency systems extraction.
- `wiki/people/jeremy-haynes.md` - linked Inner Circle page analysis as page-architecture context.
- `raw-sources/inspiration/vsl-operator-study-source-list.md` - added captured source-note links.

**Strategic note:**

The strongest new pattern is the personalized cold outreach VSL as a process-selling diagnostic: one wound, one broken path, one corrected Pulse System map, one asset preview, one boundary, one CTA. This is materially stronger than generic Loom audits.

---

## [2026-05-11] decision | Dashboard workstream scope expanded and tracked

**Decision:** Founder direction — the dashboard is not just outreach/sales. Final scope covers everything Pulsify produces a signal from: YouTube videos and channel state, Instagram posts/reels/stories/profile, outreach funnel, sales funnel, funnel health (VSL/Typeform/Cal.com), per-client delivery KPIs, and founder/operational state. Hosting and going-live are in scope, mechanism TBD.

**Status:** Still parked from active build. Tracked in dedicated workstream page so it doesn't fall off the radar. Un-park triggers defined.

**Files created:**

- `wiki/playbooks/pulsify-dashboard-workstream.md` — full scope across content/outreach/sales/funnel/delivery/ops, hosting open questions, un-park triggers.

**Files updated:**

- `wiki/index.md` — added the new playbook.

**Un-park triggers (whichever hits first):**

1. First paying client closes.
2. Outreach passes 100 DMs sent.
3. Three+ content surfaces publishing weekly.
4. Phase 3 of the 90-day plan begins (Day 46).

**Decision owner:** Abdul (operator)

---

## [2026-05-11] decision | Instagram workstream scoped, profile aesthetic parked

**Decision:** Founder direction — Instagram profile aesthetic (bio polish, highlight cover redesign, grid overhaul, brand photography) is parked. It is "already done well" for current stage. Un-park trigger: a paying client closes, cash exists, and growth justifies higher-end visual identity.

**Active IG workstream scope:**

- Story sequences (rhythm, templates, types).
- Highlights — kinds/categorization only, not aesthetic redesign: My story/New here, Start here, Results, Results 2+, Pulse System, Apply.
- Reels (native + long-form repurposing).
- Posting frequency (hypothesis to be tested).
- Topic discipline (governed by existing content pillars, IG-specific overlay).
- Scraping successful operators — a system, not a vibe; pattern log pending.

**Files created:**

- `wiki/playbooks/instagram-growth-workstream.md` — full scope, parked items, active items, sequencing into Phase 2 of the 90-day plan.

**Files updated:**

- `wiki/index.md` — added the new playbook; date bumped to 2026-05-11.

**Sequencing note:** This workstream activates in Phase 2 (Days 15–45) of the 90-day plan once funnel plumbing is live and outreach is generating call traffic. Phase 1 priorities (hit list, VSL recording, Typeform, Cal.com) are unchanged.

**Decision owner:** Abdul (operator)

---

## [2026-05-10] decision | AI content workflow thumbnail profile logged

**What changed:**

Turned Abdul's approved AI Content thumbnail iteration into a reusable content-engine profile. The page captures the exact creative direction: yellow-bar headline, faint Miro grid, flat matte AI icons, Claude UI proof stack, original-style Claude pet, and real creator frame with conservative identity cleanup only.

**Files created:**

- `wiki/content-engine/ai-content-workflow-thumbnail-profile.md` - reusable thumbnail profile, from-scratch build sequence, prerequisites, and image prompt.

**Files updated:**

- `wiki/index.md` - added the new thumbnail profile to the content-engine section.

**Decision owner:** Abdul (operator)

## [2026-07-01] decision | Shared landing-page funnel pipe and portal

Turned the Frank landing-page proof into the reusable data standard for every Pulsify
landing page. The shared integration layer now joins Wistia watch behavior to a
Typeform or native opt-in email through persistent visitor/session IDs, stores the full
client-scoped record in Cloudflare D1, pushes the subscriber into Kit through API v4,
and renders a secured multi-client funnel portal. Added the optional opt-in gate,
signed Typeform webhook verification, per-client Settings, the reusable template
contract, and the funnel-to-portal synthesis page. Local end-to-end tests passed for
page events, Wistia metrics, native opt-in, signed Typeform application, identity
backfill, and portal rendering.

## [2026-07-01] lint | Funnel deployment tooling-state block

The first direct upload scanned Wrangler's local test-state directory because the Pages
output root was the project root. The directory held only dummy local verification
records, not production D1 data or credentials. Replaced the deployment from a clean
staging directory, added `.assetsignore` and repository ignore rules, and added root
middleware that returns 404 for Wrangler, Git, local-secret, and migration paths.
Verified the previously exposed tooling paths now return 404 while the landing page,
portal, and APIs remain live.

## [2026-07-01] decision | Reusable landing-page templates + Frank copy audit correction

Moved the landing-page standard out of one-off preview mode and into reusable asset
homes under `assets/landing-page-standard/`: `canonical/` now holds the approved Codex
skin with explicit placeholders, and `variant-02/` adds a second visual direction on
the same Wistia/Typeform/proof-tag contract for Claude's future picker/editor work.
Also audited the current Frank page against `raw-sources/client-raw/frank-wieler/profile.md`
and the landing-page standard, then corrected two trust leaks in
`output/standard-preview/index.html`: removed the announcement strip above the hero
because it violated the "nothing competes above the video" rule, and removed unsourced
`1-on-1` claims from the meta/title/footer copy. The live case-study headline stayed
because it is source-backed.

## [2026-07-02] decision | Pulse operator dashboard reskin and honest empty states

Shipped the Pulse visual system to the live operator dashboard in
`Ab-luiy/pulsify-dashboard` commit `c288913`. The default dashboard now uses a
near-black grid canvas, floating control rail, coral/lavender/indigo signals,
high-contrast metric cards, stronger chart and empty-state treatment, and a compact
horizontal mobile navigation rail. Existing terminology, tabs, integrations, CRM
records, Instagram analytics, and operator signals remain intact.

Removed the demonstration revenue story from the live UI. Payments, payouts,
cashflow, cash-source attribution, calendar bookings, closer attribution, and
unconnected metric series now stay at zero until a verified source reports activity.
The payment ledger only accepts data explicitly marked `payments.live === true`.
Verified the deployed bundle on desktop and 390px mobile with no horizontal overflow
and no browser console errors. A separate read-only Claude Sonnet diff audit found no
actionable defects.

## [2026-07-02] decision | Track OS, Client OS, and YouTube channel integration

Rebuilt both live product surfaces beyond a theme pass. The operator dashboard now
defaults to Track OS with first-class light and dark modes, a latest-video YouTube
hero, and a launchpad linking Lead Studio, campaigns, delivery, and landing pages.
Added the real AB Luiy upload `9VKPb37ma5k` and public channel state, plus a six-hour
GitHub workflow that refreshes channel and latest-video stats through the existing
YouTube Data API secret. Retention, watch time, and CTR stay marked unconnected until
YouTube Analytics OAuth exists.

Rebuilt the client portal as Client OS with Overview, Funnel, Content, Pipeline,
Calls, Arsenal, Landing page, Integrations, quick access, and light/dark modes.
Preserved Lead Studio prompts and asset-generation paths. Resolved Fable QA F1–F3:
the complete deployed portal source now lives on main, the bare funnel domain and
static fallback are generic, and partial settings writes preserve omitted config.
Both surfaces were deployed and live-verified.

## [2026-07-02] lint | Flagship QA pass (Fable) — funnel pipe, render pipeline, portal, provisioning

User-approved deep QA over the deployed outreach system while Fable 5 access lasts. Read the full backend (event.js, leads.js, index.js, all /api functions, middleware, integrations JS, templates) from the current source worktree and ran live checks against pulsify-funnels.pages.dev. Result: isolation/auth/token/escaping architecture holds; four real findings — (F1) the complete deployed source exists only in the unmerged keen-tereshkova worktree, (F2) the bare domain renders Frank's real pitch to anyone (live-confirmed), (F3) /api/settings POST silently wipes fields absent from the request, (F4) the no-secret /event path can inject leads and, with Kit configured, spam a client's email list. Report + seven standing rules: wiki/synthesis/flagship-qa-2026-07-02.md. No code changed in this pass.

## [2026-07-03] lint | SDR pipeline audit (Fable) + handoff to Codex

Read-only audit of the pulsify-dashboard lead pipeline at 241dff9 (scraper, lead
scoring, injector, weekly workflow, /generate + /transcript functions, CRM layer
in index.html, portal-pipe schema). Nine findings, the big three: CRM tiers are
computed from the composite scrape score misread as subscriber count, only 14 of
489 baked leads have any contact channel (0 emails), and the live scrape queries
still target the coach/course profile the ICP reframe explicitly rejected. Report
and P0-P4 fix plan: wiki/synthesis/sdr-pipeline-audit-2026-07-03.md. No code
changed; implementation handed to Codex via AGENT_CHAT.md.

## [2026-07-03] decision | Client acquisition renovation spec (Fable) + handoff to Codex

Wrote the master renovation brief for the whole acquisition system:
wiki/synthesis/client-acquisition-renovation-2026-07-03.md. Locks one design
system (funnels skin tokens, light+dark only, theme switcher killed) across the
operator dashboard and client portal; restructures the dashboard around the
acquisition workflow (Today action queue, staged Pipeline with auto-advance from
funnels campaign signals, Sourcing yield view); reshapes the client portal into
weekly proof of value (Scoreboard, This week, Decisions, watermarked demo mode);
adds offer-native lead sources (Whop/Skool, flagged for feasibility check),
query provenance + yield pruning, and contact enrichment as the binding
constraint; upgrades every generation prompt to evidence-cited output with an
approved/rejected example bank and a machine-checkable self-check pass. Four
build waves with acceptance criteria, sequenced after the already-claimed SDR
P0+P1. Docs only, no code; implementation is Codex's via AGENT_CHAT.md. Also
updated wiki/index.md.

## [2026-07-03] lint | Business-layer audit (Fable) + payment-onboarding spec

Founder-requested full scan of the operating layer: the Jeremy Haynes VSL chain
(extraction -> VSL writer -> landing page -> pre-call emails), service delivery,
live copy, and titles. Verdicts: chain is sound and internally consistent; live
Frank copy passes every rule; the real problem is a three-way content-doctrine
contradiction (CLAUDE.md categories vs craft-only niche batches vs the live
"as a coach" video title) that mirrors the ICP query reframe and needs a founder
decision. Eight findings in wiki/lint-report.md (application->booking email gap,
stale outreach-asset landing section, three conflicting payment-rail records,
stale SOP pointers, index rot — the index rot fixed in this pass). Also wrote
wiki/synthesis/payment-onboarding-automation-spec.md: payment event -> D1 ->
auto Kit email + onboarding form + portal link + operator notify, with a
"Mark paid" fallback so SWIFT/crypto reality works day one; gated on the rail
decision and the missing Q1/Q3 of the buyer-psychology questionnaire. Updated
wiki/index.md (new rows + fixed the dead content-batch link).

## [2026-07-03] lint | Copy-system audit + hardening spec

Founder asked how every piece of copy gets written (VSL, webinar, emails, all of
it) and for the system to be hardwired against bugs and drift. Inventoried all
four writing surfaces (vault prompts, Lead Studio buildPrompt, the triple-copied
provisioning prompt, the titles skill) across 17 asset types. Six bugs verified
in code: Lead Studio's "landing page copy" asset still teaches the dead
pre-standard pattern two menu slots away from the correct one; three divergent
voice-guard variants across surfaces with no drift detection; the outreach VSL
rule has no 6-step structure; no webinar writer exists; the application->booking
email window has no copy; the provisioning prompt is hand-synced across three
copies in two repos. Fix design (canon voice guard + CI drift checker + missing
prompts + Part 5 fold-in): wiki/synthesis/copy-system-hardening-spec.md, handed
to Codex at gpt-5.5 high, sequenced after the client portal build. Also parked
the "Niksetting" identity question per founder (IG-systems workstream, memory
note written, no characterization).

## [2026-07-03] decision | Integrations hub spec (founder: integrations are most important)

Founder asked for app integrations (Google Calendar, Slack, Kit, everything
relevant) connectable from the dashboard and portal. Wrote the full design:
wiki/synthesis/integrations-hub-spec.md. Core decision: the hub lives on
pulsify-funnels (D1 + secrets + auth already there), dashboard and portal are
its two faces over the existing bridge/token patterns. Inventoried the whole
stack into three phases: I1 money path (Kit operator+client, Cal.com webhooks,
Calendly paid option, Whop/Stripe payment normalizer feeding the payment-
onboarding trigger, Discord webhook alerts), I2 visibility (Google Calendar +
YouTube Analytics OAuth, Slack bot, Wistia, Composio status), I3 parked
(Typeform API, Drive/Notion, WhatsApp). Security inherits the masked-secret /
resolveAccess / delivery_failures patterns; OAuth tokens encrypted at rest.
Fanbasis webhook capability explicitly flagged unverified. Handed to Codex
(gpt-5.5 high); I1 rides with or right after the portal build.

## [2026-07-03] decision | Portal v2: connection-first product spec

Founder reviewed the Scoreboard mock: approved the direction earlier, then
reframed the product — the portal is the client's connection hub first (they
log in and connect Kit, YouTube, IG, Cal.com/Calendly, Stripe/Fanbasis/Whop,
Zapier), proof-of-value second, and no sample stats anywhere including mocks.
Also flagged design bugs; root causes confirmed in the mock's css (metric
tracking -0.05em cramping numerals, red trend dots reading as errors, no
consistent spacing scale, landing-page-size h1). Scanned the commercial portal
market (Assembly/Copilot, SuiteDash, Wayfront) and cut the standard module set
to what Pulsify needs — messaging/e-sign/knowledge-base skipped, the connect
surface is the differentiator no vendor has. Full spec:
wiki/synthesis/client-portal-product-spec.md. Stage-2 mock (first-login connect
state, empty scoreboard, design fixes) gates the full build. I1 hub build
running concurrently gets an additive delta: client-token-scoped writes for a
client's own integration rows.

## [2026-07-11] ingest | Niksetting Perplexity export audited + transcript-2 Claude extraction

Audited the founder's Perplexity export (raw-sources/transcripts/Niksetting Perplexity transcript extraction.md): 23 extraction blocks covering ~20 Niksetting videos, but raw transcripts are not preserved (export truncates user messages) except transcript 2, which Perplexity counted as ingested yet never extracted. Its closing self-audit also wrongly claimed only the 4-part masterclass was ever sent. Wrote wiki/synthesis/niksetting-transcript-optimizing-for-views-claude-extraction.md — full 12-section Claude extraction of the preserved transcript, closing the gap and benchmarking Claude vs Perplexity fidelity. Raw transcripts needed from founder for full re-extraction.

## [2026-07-11] ingest | Niksetting raw transcripts landed + Claude extraction pass begun

Founder supplied the full raw transcript doc (21 videos, 83,250 words). Verified: all 21 titles match the Perplexity thread, none empty, and transcript 02 is character-identical to the copy preserved in the export — source is trustworthy. Split into per-video files at raw-sources/transcripts/niksetting/ (01-21). Claude extraction pass started at wiki/synthesis/niksetting-extractions/: 02 (traffic vs conversion), 07 (story sequences — 7 frameworks), 10 (8 content formats), 12 (bio), 17 (posting schedule) done. 16 remain. Extraction 02's old standalone path was moved into the folder.


## [2026-07-11] ingest | Niksetting corpus fully extracted - all 21 transcripts

Completed the Claude extraction pass over the entire Niksetting raw corpus (83,250 words): 24 extraction pages now live in wiki/synthesis/niksetting-extractions/ (01-20 + masterclass 21a-d). Structural discoveries: videos 03 and 04 are verbatim cuts of the masterclass (recurrence de-duplicated); the five story-sequence types + universal 6-step slide structure + 9-slide daily frame + 4-part screenshot-proof structure are all captured verbatim - the story-sequence generator's full spec now exists in-vault. Cadence contradiction resolved (3 sequences/week floor, 5-7 target; 3-7 slides/day). Persistent gaps flagged: save rate never defined, Machi unidentified, lead magnet deliverable contents unknown, appointment-setting video not in corpus. Also filed SooWei Goh raw transcripts (5 videos, ~41K words) at raw-sources/transcripts/soowei-goh/ - extraction queued.

## [2026-07-11] decision | Personal-brand harmony master plan filed

Wrote wiki/synthesis/personal-brand-harmony-master-plan.md - the strategic synthesis of the full Niksetting ingestion: the unified YouTube+Instagram machine, 9 new framework pillars to build, upgrades to 7 existing pages, 4 doctrine tensions with recommendations (landing pages, proof currency, bio breadth, volume), automation gates (Claude skills now, Codex builds on approval), and sequencing. Supersedes nothing; extends instagram-project-roadmap Phase 2.


## [2026-07-11] ingest | SooWei Goh corpus fully extracted - all 5 transcripts

Completed the Claude extraction pass over the SooWei Goh raw corpus (~41K words, 5 videos) into wiki/synthesis/soowei-goh-extractions/. Highest-value finds: the full AI agent stack (transcript 03 - he runs the exact AI-assisted model Pulsify sells), the complete buyer-mirror question list (04), the three industry predictions incl. lifestyle-marketing-will-die (05 - independent confirmation of the trust-recession thesis), the pay-me-three-times ascension offer model, and the dollar-per-follower metric. Cross-creator contradiction ledger updated: niche-vs-broad TOF, volume, CTA doctrine, production quality, landing pages. Both corpora now fully extracted (26 + 5 source videos, ~124K words); next step is the cross-creator synthesis (laws vs test variables).


## [2026-07-11] decision | Cross-creator synthesis + story-sequence system shipped

Wrote wiki/synthesis/cross-creator-synthesis.md (the verdict layer: 18 laws both creators corroborate, 7 contested dials with recommended defaults, single-source registers per creator, the fusion thesis) and wiki/frameworks/story-sequence-system.md (pillar 1 of the master plan: canonical five types, universal 6-step slide structure, 9-slide daily frame, start-here 10-slide, story launch, cadence 3-floor/5-7-target, delegation split, drop-off measurement, Pulsify proof-currency delta applied). The framework page is the direct spec for the story-sequence generator skill. Remaining pillars per personal-brand-harmony-master-plan: conversion assets, reel ladder, messaging/reframe, proof system, format invention, operating rhythm, people pages, contradiction ledger.


## [2026-07-12] decision | Dials ratified; pillar 2 + profile-funnel rewrite shipped

Founder ratified all 7 contested dials (cross-creator-synthesis.md updated to RATIFIED status): notable rulings - engineered CTAs primary (SooWei's no-CTA stance rejected), raw clarity over production arms race, landing-page-vs-start-here is a per-audience test with landing page as the never-fails prior, and give-everything-away value doctrine (Hormozi line). Ratification persisted to Claude memory. Shipped wiki/frameworks/instagram-conversion-assets.md (pillar 2: five assets, governing math, consumption ladder, email spec) and the full rewrite of wiki/concepts/profile-funnel.md (3-second bio doctrine, two-CTA rule, proof pin posts, start-here, DM conversion-cycle rules, ads-to-profile; May's lifestyle-content contradiction resolved via the proof-currency rule; the missing-Niksetting-SOP gap closed).


## [2026-07-12] decision | Story-sequence visual capture protocol created

Built wiki/content-engine/sequence-breakdowns/ (README protocol + per-sequence template) and raw-sources/inspiration/story-sequences/ for the founder's screenshot drops. Design: raw images immutable in raw-sources, one wiki page per sequence with screenshots embedded inline (Obsidian renders them) above a per-slide annotation layer capturing overlay text verbatim, emphasis marks (underlines/highlights/caps), dwell slides, visuals, interactive stickers, the 6-step job per slide, CTA position, and drop-off. Every capture feeds the story-sequence system page and the future generator.


## [2026-07-12] decision | Carousel capture protocol added

Founder flagged high-design carousels as a second visual asset class alongside story sequences. Built wiki/content-engine/carousel-breakdowns/ (README protocol) + raw-sources/inspiration/carousels/. Annotation axes differ from stories: typography system, layout/whitespace, color treatment, design devices, swipe engine, cover deep-read, and design-system extraction (template-ready replication notes). Carousels are the thinnest area of both corpora, so captures here build the knowledge base directly; a carousel framework page follows once enough examples land.


## [2026-07-12] decision | Photographic read added to sequence capture

Per founder request, the sequence-breakdown protocol now mandates a full photographic read per slide: shot type, mood (the emotional argument of the frame), wealth register (raw/neutral/elevated/luxurious and what carries it), production level and lighting, and a two-way sync check (shown-vs-said, mood-vs-slide-job). The sequence dissection gains a visual grammar section capturing each creator's photographic system and the Pulsify proof-currency equivalent.


## [2026-07-12] ingest | First visual captures: 3 carousels + the "New here?" start-here sequence

Founder dropped 45 screenshots. Triaged: 3 Niksetting designed carousels (grow-acquisition-onboarding 9 slides, 964k-story-sequences 10 slides incl. one broken slide 09, 7-lessons-content 8 slides) filed under raw-sources/inspiration/carousels/niksetting/; and the 18-slide "New here?" highlight filed under raw-sources/inspiration/story-sequences/niksetting/new-here/ with a full breakdown page at wiki/content-engine/sequence-breakdowns/niksetting-new-here.md. Major finds: (1) the deployed start-here is 18 slides vs the taught 10 - framework updated with the deployed architecture + the reusable lesson template; (2) "Machi" resolved = Mochi, his funnel-tracking software (cross-creator synthesis updated); (3) the 964k carousel caption carries his official 7 sequence types (value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA) - reconciliation into the framework pending; (4) his visual grammar is maximal-luxury proof, the largest divergence from Pulsify doctrine, adaptation path documented (structure kept, currency swapped). Carousel breakdown pages pending.


## [2026-07-12] decision | Ingestion skill + generator skill + portal spec stub

Built two project skills so post-Fable models operate at the set bar: .claude/skills/sequence-ingest/ (the perception method for _inbox screenshot drops: UI-chrome identification, progress-bar mapping, clustering, filing, the full per-slide annotation standard with niksetting-new-here.md as the mandatory reference, and the feed-back loops into framework/synthesis/index/log/AGENT_CHAT) and .claude/skills/story-sequence-generator/ (type menu incl. Niksetting's official 7 + start-here + launch, intent mapping, photo-request flow with Pulsify proof-currency recommendations, 6-step + 9-slide generation contract, hard copy rules, ratified-dial compliance). Portal Content tab spec'd as a stub (wiki/synthesis/portal-content-studio-spec.md) - Codex build gated on founder approval and on the chat skill producing shippable sequences first.


## [2026-07-12] decision | Overnight pass: type canon reconciled, naming freed, client dashboard fully spec'd

Founder rulings applied while he sleeps: (1) story-sequence type canon reconciled to Niksetting's official seven (value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA) with the reconciliation map from the masterclass five and video 07's seven frameworks - framework + generator skill updated; (2) start-here highlight naming freed ("new here?" is one example; "start here", "clients", "student wins", multiple proof highlights all valid) - framework + skill updated; (3) portal-content-studio-spec.md rewritten as the FULL client dashboard spec: credentialed login, the founder's 8 sections, the complete metrics inventory cross-checked against both corpora (drop-off/completion/per-slide views/DM interactions/copy log/cadence-and-type-mix from Niksetting; $-per-follower/ICP-leads/attributed-calls/follow-to-book/week-over-week from SooWei; save rate flagged as undefined-in-source), honest data-source notes (IG story views = manual v1), 4 phased Codex work orders, and the pre-built inventory (portal links, integrations hub I1, Atelier skin, view tracking, the two skills) so nothing already built is dropped. Codex fire remains gated on the founder's morning go.


## [2026-07-12] client-update | Client dashboard P1 LIVE

Fired on founder's "fire p1". Codex built (1,637 insertions, 14 files: auth shared lib, migration 0011, 6 API endpoints, portal shell + login pages, admin setup-link block); Claude reviewed, caught two prod-only bugs (ASSETS 308 redirect loop on /portal; PBKDF2 150K > Workers' 100K cap), repaired the remote D1 migration ledger (was empty vs live schema - backfilled 0001-0011), deployed to pulsify-funnels --branch main, and live-verified end to end with a temporary seeded login (removed after). Clients can now log in with email+password at /portal/login; dashboard shell shows Revenue (wired to real payments), Plans/To-dos/Team/Momentum (admin-editable), Content/Performance/Studio empty states for P2/P3. Operator flow: /admin client editor -> Dashboard login -> generate one-time set-password link. P2 gated on founder go.


## [2026-07-12] client-update | Client dashboard P2 LIVE - the sequence studio

Fired on founder's "p2 fire". The dashboard's Studio section now generates story sequences: type cards (the canonical seven + start-here) or free-text intent, goal-driven CTA placement, trigger word + proof lines in, slide-by-slide copy with emphasis notes and shootable photo requests out; draft -> review -> operator approval flow with an /admin review queue. Provider chain Gemini -> Anthropic -> manual prompt (currently manual on prod until a key is set). Email layer: with RESEND_API_KEY, setup links email themselves and password setup requires a 6-digit inbox code; without it, P1 flow unchanged. Claude review enriched the prompt builder with per-type structures and ran the full local + live verification (Codex sandbox lacks wrangler). Migration 0012 applied remotely through the repaired ledger.

## [2026-07-12] decision | Email layer parked; no LLM key on the studio

Founder rulings: domain purchase (and with it Resend email delivery + 6-digit verification) waits until the first client - the copy-the-link login flow is the operating path meanwhile. No Gemini key on pulsify-funnels: the studio stays in manual mode by design so all sequence copywriting remains Claude-in-session with full vault context; P3 gains a paste-back field for finished sequences.


## [2026-07-12] client-update | Client dashboard P3 LIVE + four framework pillars filed

Fired on founder's "p3 fire". The Performance section now logs story sequences and computes drop-off (last/first views) with the slide-2=hook-failed / slide-7=body-failed diagnostics, cadence vs the 3-floor/5-7-target, and type-mix; the weekly card gives week-over-week follower/ICP-lead deltas plus dollars-per-follower off real payments. Studio gained the paste-back field so Claude-written sequences enter the review flow. Live-verified end to end (temp login, removed). While Codex built, filed four canonical framework pillars from the corpora: wiki/content-engine/reel-format-ladder.md, wiki/frameworks/messaging-reframe-system.md, wiki/frameworks/proof-system.md, wiki/playbooks/format-invention-pipeline.md. Remaining pillars: operating rhythm, two people pages, contradiction ledger; then the 3 carousel breakdowns.


## [2026-07-12] ingest | Grow Acquisition onboarding carousel broken down; overnight pillar sweep complete

Full breakdown of the flagship Niksetting carousel (wiki/content-engine/carousel-breakdowns/niksetting-grow-acquisition-onboarding.md): his 7-step delivery methodology packaged as a 9-slide carousel - a landing page in Instagram form. Key finds: slide 3 (his own profile mockup) directly validates the founder's free-highlight-naming ruling (his rail: Start / Wins / New here? / Clients); slide 8's dashboard wall IS Mochi; the whole thing is a replicable design system that could template a Pulsify sales carousel / methodology page. Two remaining carousels (964k-story-sequences, 7-lessons-content) pending full breakdown - the 964k caption's 7 types are already reconciled into the framework. Overnight framework sweep now complete: reel-format-ladder, messaging-reframe-system, proof-system, format-invention-pipeline, content-operating-rhythm, plus people pages for niksetting + soowei-goh - all filed and indexed. Personal-brand-harmony master plan pillars substantially delivered.


## [2026-07-12] ingest | All 3 Niksetting carousels broken down + carousel framework written

Completed the carousel corpus (founder: "that's all the carousels I've currently got"). Full breakdowns of all three: grow-acquisition-onboarding (methodology-as-document), 964k-story-sequences (the definitive 7-type matrix - cadence/function/audience per type, now folded into story-sequence-system.md AND the generator skill), 7-lessons-content (philosophy set, 7 one-word concept lessons each mapping to an existing framework). Wrote wiki/frameworks/carousel-system.md from the three: the 3 proven structures, the design system (cover=thumbnail, chip code, swipe engine, one-word/numbered typography), cadence/role, CTA mechanics - this unblocks the portal carousel studio (P4). Notable: 964k caption's 7 types now have full deployment guidance; Claude confirmed as the space's default AI (7-lessons 'creativity' slide); Mochi appears again (964k breakdown slide + themochi.app commenting). All indexed.


## [2026-07-12] decision | Fable handoff written for the Instagram project

Wrote wiki/synthesis/instagram-project-fable-handoff.md as Fable access ends: the single page the next model reads to continue the Instagram workstream. Captures DONE (both corpora extracted, 9 framework pillars, 2 skills, captures broken down), LIVE (dashboard P1-P3 on pulsify-funnels), DECIDED (7 ratified dials + proof-currency rule + no-LLM-key + parked email - do not relitigate), and LEFT in build order (validation loop on Pulsify's own IG = the real unlock; P4 sections now unblocked; more captures; the missing appointment-setting source; a third creator for adaptability). North star = the fusion thesis.

## [2026-07-12] decision | Full dashboards audit + portal strategy + onboarding map

Founder requested a full sweep of all dashboards/portals + skin fix + onboarding research. Wrote wiki/synthesis/dashboards-audit-and-portal-strategy-2026-07-12.md. Honest finding: NOT a bug problem - the code is functionally sound and defensively written (esc() escaping, correct metrics math, responsive, dark mode, all P1-P3 flows verified). It is a COHERENCE problem: 4 surfaces (operator Mirage dashboard, client dashboard blue/Inter, admin own-CSS, landing standard) speak 4 visual dialects, and the client-facing dashboard reads generic-SaaS not branded-Pulsify. Fix = extract one shared design-token stylesheet + unify the 3 funnels-repo surfaces, gated on ONE founder decision: which identity is Pulsify (rec: unify onto Mirage). Onboarding: ~60% already built (payment webhooks + Mark-paid + Discord alerts live via integrations hub I1; manual checklist + automation spec exist); the new client dashboard gives it a target; remaining = wire payment->auto-create-login + seed template + email rail (parked till first client domain). Portal future-use vision documented (weekly proof-of-value -> productized $10K prescriptive system).

## [2026-07-12] client-update | Trakyo reskin LIVE on client dashboard + login + admin

Founder chose the Trakyo design direction (real file recovered from Desktop, staged at raw-sources/inspiration/design/pulsify-trakyo-DIRECTION.html). Codex built a shared design-token stylesheet (output/standard-preview/shared/pulsify-ui.css: money-green #0ea968, Inter + JetBrains Mono tabular numbers, 3-tier soft shadows, 16px radius, KPI cards, collapsible rail, gradient buttons, stagger) and reskinned the client dashboard, login, and admin onto it - fixing the four-dialects coherence problem in one move. Visual-only: portal + login script blocks byte-identical pre/post, no logic/auth/API/D1/metrics changes. Deployed + live-verified (all flows intact, frank regression clean). Onboarding automation held until first client per founder.

## [2026-07-12] decision | Studio redesign (impeccable craft) + full Codex spec

Founder: studio is the centerpiece and was underbuilt. Ran the impeccable craft flow (product register, no image-gen so brief+Trakyo reference = the visual contract). Rebuilt the Studio in the preview mockup into a content command center: insight/summary strip (what is working + reiterate actions), the 7 type cards + carousel-create, a story-sequences library (folded rows labeled by date, mini widgets: completion/DMs/drop-off, expand to slide strip), and a carousels library (folded Carousel 01/02/03, saves/reach, expand to slide thumbnails) - all keyboard-accessible with focus rings + reduced-motion. Deployed to the preview URL. Wrote the full craft spec at wiki/synthesis/client-dashboard-redesign-spec-2026-07-12.md (studio centerpiece, revenue settings+integrations, team calendars+task board, this-week home replacing Momentum, plus the impeccable production bar: all states, empty/skeleton, focus/keyboard, contrast, 150-250ms motion) - ready to hand to Codex to build against live data. Not fired yet; awaiting founder sign-off on the studio direction.

## [2026-07-13] decision | Studio rebuilt to SaaS grade + full Codex spec

Founder: expand the preview, make us stand apart, easier to retest, build as if a SaaS company (visuals, tracking, replicating, data-backed, use data to create more). Ran impeccable craft flow (product register). Fixed a real bug first: every icon used Tabler classes but the webfont was never loaded, so all icons were invisible on the live preview - added the CDN, verified all 27 glyph names resolve + document.fonts confirms it loads. Rebuilt Studio around the product spine diagnose->create->track->retest->replicate: diagnosis engine (data-derived winning type + exact leak slide + prescription), content pipeline (6 stages, click to filter), create row, WINNING FRAMES rail (reuse proven skeletons), sequence library (folded by date, status pills, mini retention sparklines, per-slide retention %, variant/retest lineage, segmented filter), carousels by number. Added the retest loop (leaking hook -> tracked v2 variant -> compare). Cross-cutting SaaS systems on the whole app: command palette (Ctrl+K, 17 actions), toasts, skeleton loading, live pulse, full keyboard/focus/reduced-motion. Performance got a slide-by-slide retention curve (SVG) + type leaderboard + log-sequence modal. Self-critique caught + fixed 3 defects: banned side-stripe on the next-move card, --muted contrast (#868c98->#667085), invalid intg-grid minmax. Deployed to pulsify-funnels.pages.dev/portal-preview/ and verified live via DOM: all JS-generated content renders, 0 console errors, every interaction works (folds/filters/retest/palette/toasts), no horizontal overflow. Codex spec at wiki/synthesis/client-dashboard-redesign-spec-2026-07-12.md updated with the product spine, retest loop, new tables (studio_carousels, sequence_variants, studio_frames, status enum), and the cross-cutting systems. Ready to hand to Codex; awaiting founder sign-off on direction.

## [2026-07-13] decision | Fixed overlay bug + integrations marketplace + settings tab

Founder reported a blurry screen when opening Settings/Integrations/generate. Root cause: inverted z-index scale (backdrop 50 sat ABOVE the drawers at 40, so drawers opened behind the blur). My prior automated test checked the .show class was added, not actual paint order, so it missed a purely visual bug the founder caught. Fixed the scale (backdrop 30 < drawer 40 < modal 60) and verified with a real stacking test: document.elementFromPoint at the modal center now returns modal content, not the backdrop. LESSON: state-presence checks do not prove visual stacking; test elementFromPoint / paint order for overlays. Promoted Integrations and Settings from cramped drawers to full tabs (founder: isolate into separate tabs). Integrations is now a real marketplace: 26 connectable services across 7 categories (payments/email+SMS/booking/content+social/automation+CRM/analytics) with search + category filter, per-service detail modal (what it syncs, permissions/scopes, connection fields), and a connect flow with a real connecting->connected loading state + sync toasts (the YouTube-style loading he asked for), plus an Active automations layer (trigger->action rows with toggles, e.g. payment->onboarding, DM trigger word->tag+notify, drop-off->draft retest) = the backend automation surface. Settings is now a 6-section tab (workspace/brand voice/content/notifications/access/billing incl danger zone). Voice scrubbed per founder: removed all reward/celebratory copy and every em-dash/en-dash from the UI (0 in markup). Deployed + verified live: 0 console errors, all tabs render, connect flow transitions, no horizontal overflow, dark mode intact. Spec at wiki/synthesis/client-dashboard-redesign-spec-2026-07-12.md.

## [2026-07-13] decision | Bio optimizer added to portal preview

Codex took over after Claude hit usage limit on the bio-optimization lane. Added a dedicated Profile tab to `output/standard-preview/portal-preview/index.html`, grounded in Niksetting's 3-second bio doctrine and the profile-funnel rewrite: optimized bio preview, 3-second stranger test, clarity/polarity/proof/next-step scoring, current leak list, rewrite formula, CTA routing, and a bio editor modal. Home now routes the next move into Profile. UI copy kept factual with no reward microcopy and zero em-dashes/en-dashes in the preview markup. Updated the dashboard craft spec to include the Profile funnel tab before Studio.

## [2026-07-13] ingest | Bio optimization framework + Codex bio-tab review

Reviewed Codex's bio-optimization build in the portal preview (Codex took the lane while Claude was at usage limit, per AGENT_CHAT 18:52/19:32). Verdict: passes. The Profile tab is faithful to Niksetting extraction 12 - 3-second stranger test (3 questions), broad-who/specific-what (no revenue-band or identity boxing), category-of-one name, backtrackable proof (student results only), attract/repel filter, two CTA paths. Live-verified on pulsify-funnels.pages.dev/portal-preview/: 0 console errors, bio modal paints above the backdrop (z-index correct), no overflow, 0 em/en dashes, no reward copy, all sub-components render, command palette has Rewrite the bio. One honest limitation: the bio score (78%, Clarity/Polarity/Proof/Next-step) is illustrative demo data, not computed from a live bio yet; the production build wires the four dimensions to the entered text. Filed the canonical framework wiki/frameworks/bio-optimization-system.md (the doctrine as an operational checklist + the four score dimensions the tool uses), cross-linked from profile-funnel + indexed. The bio doctrine was previously only in a raw extraction + a profile-funnel summary paragraph; now it is a first-class framework page grounding the feature.

## [2026-07-13] ingest + build | Sequence/carousel design system + reel capture-to-content engine (overnight)

Founder tasks (going to sleep, PC left on for overnight work). Read the actual captured frames (18 sequence slides + 3 carousels) directly, not just the notes.

TASK 1 (design): filed wiki/content-engine/sequence-carousel-design-system.md - the visual grammar the copy sits in. Confirmed from images: the hand-drawn MARKER ANNOTATION layer (red underline = pain/wrong, green underline + check = win, red scribbled box around the receipt, blue arrow at proof, single red word for emphasis) - this is the red-underline feature that spread. Type: heavy sans in white pill-boxes + red word; white drop-shadow body; carousels add giant ghost numbers + serif-plus-sans editorial covers + hand-underlined key nouns. Image classes: proof screenshot / device mockup / proof wall / real workspace (lifestyle excluded by design). The chip colour code (cadence/function/audience) is the reusable innovation. Rule: keep every design move, swap currency (lifestyle -> student proof). KEY: generators must output DESIGN DIRECTION per slide, not just copy. Built into the preview: a Design system card in Studio with a live rendered slide (pill-box + red word + green marker underline SVG + red receipt box + image-class label), and the generator modal now shows per-slide design direction (annotation/image/type).

TASK 2 (reels): filed wiki/content-engine/reel-capture-to-content-engine.md. Two modes (redistribution: clip long-form/calls; origination: a thought becomes a reel). Capture inbox -> translation layer (one thought -> reel + story + carousel + long-form) -> angle library (win->credibility, strategy->value/breakdown, belief->philosophy/reframe, objection->Q&A, BTS->day-in-life, transformation->proof) -> reframe rotator (one belief, many presentations) -> confidence loop (every reel feeds the diagnose metrics so intuition gets backed by data - answers the founder's stated confidence gap). Built into the preview: new Reels tab with all of it, capture flow adds a thought and translates to 4 formats.

Both indexed. Preview deployed to pulsify-funnels.pages.dev/portal-preview/ and live-verified: design-system card + marker SVG render, generator design-direction rows, Reels tab (2 modes, 6 angles, 5 reframes, capture->4 formats), 0 console errors, 0 em/en dashes, no overflow, dark mode intact. Codex handoff for production wiring next.

## [2026-07-13] synthesis | Pulsify portal master architecture (founder full vision)

Founder voice brief (two parts, recording cut off twice): the full productized-portal vision. Captured + structured at wiki/synthesis/pulsify-portal-master-architecture.md. Core: (1) TWO-TIER portal - client user-view + operator god-view (impersonate any account invisibly, like platform support, WITH an audit trail) + cross-client rollup; (2) THE CLIENT BRAIN = the differentiator, a structured living knowledge base per client (ICP/offer/mechanism/stories/tone/proof/lifestyle) that feeds our generators AND exports as a context package for the client's own AI (productizes how the founder uses Obsidian+AI; ties to the no-our-keys/manual-mode decision); (3) ANIMATED ONBOARDING PAGE (separate, premium, fades in/out) where connections are made and AUTO-WIRE to the portal (OAuth at onboarding -> tokens stored -> sections live on first login, connect once never reconnect); voice-note offer -> transcript -> auto-populates the brain so the portal is warm not empty; (4) INTEGRATION CENTER routing to sections not one page (Stripe/Fanbasis/Whop/Skool->Revenue, Kit->email composer, YouTube->video metrics gallery [pull stats never upload], IG->reels/stories/carousels galleries, IG DMs/ManyChat->DM funnel, Zoom/Calendar->bookings, Slack/Discord->alerts); (5) MEDIA GALLERIES not tables (every YouTube video by thumbnail, playable in-portal, expandable per-video retention/click charts; IG reels + story-sequence + carousel galleries with charts); (6) the WORK section = context handoff (client picks a piece, gets the context package from their brain, runs it on their OWN AI). MY ADDED LAYERS: proof vault (feeds the design-system generators), pulse feed (cross-tool activity heartbeat), proactive Action Engine, client health/churn score in god-view, white-label feel, impersonation audit trail. KEY GROUNDING: outreach view/watch/IP tracking is ALREADY BUILT + LIVE (page_events/watch_events, per-viewer breakdown, 75% hot-watch Discord alert, /a/{token} off-page redirect tracking) - just buried in /admin, needs surfacing + a warm-lead follow-up queue; onboarding automation ~60% built (payment event/Mark-paid/token/pipeline, voice-note intake in CO1 doc, email rail parked till first domain). Build order: client brain+onboarding wizard first (highest leverage), then surface tracking->follow-up queue, then integration section routing, then media galleries, then god-view upgrades, then proof vault+pulse feed. Open decisions: IG DMs direct vs ManyChat, payment rail standard, contract tool (PandaDoc/DocuSign) + onboarding connects to operator dashboard (recommended, provisions the client portal). This doc is the new north star superseding the piecemeal specs.

## [2026-07-15] decision | Client brain field structure proposed + filed

Founder approved proposing the structure. Filed wiki/synthesis/client-brain-spec.md: 8 sections (identity, offer, ICP, story, voice, proof vault, funnel facts, do-not list), each with a source + freshness stamp, no invented fields. ICP section mirrors the existing avatar research schema (read from marcus-icp-research.json: frustrations, desires, language, objections, false beliefs, triggers, raw language, pain scenarios). Offer + story fill from the onboarding voice-note transcript; proof vault = R2 media + D1 index tagged by the 4 allowed image classes (feeds the design-direction generator); the whole brain exports as one context package for the client's own AI. Build contract for Codex included (client_brain + proof_assets tables, Brain tab with inline edit + gap indicators + export button, generators read the brain server-side). v1 transcription = operator-pasted transcript. Awaiting founder edit of fields, then fire.

## [2026-07-15] build | Client brain Phase 1 LIVE (Sol build, Claude review+deploy)
Migration 0014 (client_brain + proof_items) on remote D1; token-gated Typeform-style 14-step onboarding form at /onboard (client sections only), client-brain.js endpoint (token client writes + ADMIN_KEY admin reads/edits), 8-section operator Brain view in /admin (funnel + ICP-research operator-only). Reviewed: auth correct, client/operator split correct (0 operator fields on client form), 3 tests pass, additive migration, 0 dashes. Deployed + verified, regressions intact. Spec at wiki/synthesis/client-brain-spec.md. NEXT (Phase 2): generators read the brain when composing prompts + the markdown context-package export for the client's own local folder. BLOCKER for proof images: founder must enable R2 in Cloudflare dashboard (v1 uses paste-links).

## [2026-07-15] build | Client brain Phase 2 locally verified

Wired the authenticated client brain into the existing Studio and Reels prompt path. Saved offer, ICP, story, voice, proof, funnel facts, and do-not fields now shape the prompt; operator trigger words fill an omitted request value; only permission-granted proof is promoted automatically. Added an `ADMIN_KEY`-gated Markdown context-package export to the operator Brain view with all eight sections, sources, freshness, gaps, proof permissions, attachment headers, and `no-store`. Mocked-D1 acceptance and the existing client-brain, follow-up, tracking, and integrations regressions pass. Browser verification confirms the Brain route and one-click export flow with zero warnings or errors. Local only, awaiting the required review and deploy; Claude quota was 97 percent session usage, so the cross-review was skipped under the repo gate.

## [2026-07-15] build | Client brain Phase 2 LIVE after cross-review

Claude's read-only handover review passed the auth, isolation, export, empty-brain, and Workers checks, and caught one real permission leak before deploy: denied proof was excluded from promoted proof lines but still present in the mirrored `client_brain.proof.items` context sent to the model. Fixed it structurally and extended the Phase 2 test with granted, unknown, and denied mirrored rows. Denied proof is now absent from the prompt; unknown proof remains permission-tagged for confirmation. All five suites pass. Deployed the current `output/standard-preview` to Cloudflare Pages at `https://7f8f6a85.pulsify-funnels.pages.dev`; production checks on `pulsify-funnels.pages.dev` passed: admin 200 with export wiring, unauthenticated export 401, unauthenticated Studio 401, portal login 200, and Frank regression 200. No migration was required.

## [2026-07-15] build | Operator command center Phase 1 LIVE (Sol build, Claude review+deploy)
God-view cross-client rollup in /admin: per-client collected/trend/cadence/brain-completeness/last-activity + a 0-100 health score (healthy/watch/at-risk/new), at-risk-first, over a fixed 8-query aggregate (no N-per-client). Migration 0015 operator_events audit table + view-client audit logging + recent activity. ADMIN_KEY gated. Reviewed (auth, additive migration, 3 tests pass, 0 dashes), migrated remote, deployed, verified (401 unauth, regressions intact). Chosen as the fully-hands-off build. NEXT open buildable: integration section routing (Kit email composer, needs Kit key to send), god-view Phase 2 read-only impersonation (security-sensitive), proof vault section + pulse feed, port Trakyo redesign to production. Blocked-on-founder: media galleries (YouTube/IG OAuth), email rail (domain), payment webhook (rail choice).
## [2026-07-15] build | Proof vault + pulse feed LIVE (Sol build, Claude review+deploy)
Client portal gains a Proof vault tab (gallery of proof_items - R2 images + video links, claim captions + permission status, upload-more via existing media-upload, student-results-never-lifestyle surfaced in UI, honest empty state) and a Pulse feed (reverse-chron 30-day heartbeat merged from payments, page/watch events, studio sequences, sequence log, proof, integration events, content items - all token-scoped, no new tables). Reviewed: isolation proven in tests (8 sources bound to client, cross-client proof edit blocked), all 9 suites pass, 0 dashes, no migration. Deployed + verified live. Remaining hands-off queue: port Trakyo redesign to production portal, god-view Phase 2 impersonation (careful pass), Kit email composer (buildable, sending needs Kit key). Blocked-on-founder: media galleries (YouTube/IG OAuth), email rail (domain), payment webhook (rail choice).
## [2026-07-16] build | Trakyo port Phase 1 LIVE: production Home + Performance (Sol build, Claude review+deploy)
Production portal Home is now the This-week screen (real weekly/all-time cash, followers+delta, $/follower, DMs, rule-based next-move card from real diagnostics, shipped list, to-dos, Pulse) and Performance gained the per-slide SVG retention curve (cliff marked) + type leaderboard, all real-data-or-instructive-empty (0 preview demo literals, verified). Logic intact: API surface unchanged, all 9 suites pass, auth gate intact. Deployed + smoked. Remaining hands-off queue: Trakyo Phase 2 (Revenue drawers, Team board, Plans, Studio insight strip), god-view Phase 2 impersonation (careful pass), Kit email composer.
## [2026-07-16] build | Trakyo port Phase 2 LIVE: Revenue, Team, Plans, Studio insight (Sol build, Claude review+deploy)
Production portal now fully wears the approved Trakyo design across all current-data surfaces: Revenue (real KPI cards, brain revenue goal, payment table, real integration states, client-editable identity), Team + Plans (preview-grade cards, honest empty states, zero invented data), Studio (This-week's-read insight strip off the shared rule engine + real pipeline counts). Reviewed: 9 suites pass, 0 demo data, API surface valid, deployed + smoked. Hands-off queue remaining: god-view Phase 2 read-only impersonation (careful pass), Kit email composer (sending gated on Kit key). Blocked-on-founder unchanged: media galleries (YouTube/IG OAuth), email rail (domain), payment webhook (rail choice).
## [2026-07-16] build | Read-only client impersonation LIVE (Sol build, Claude security review+deploy)
God-view Phase 2: operator opens any client portal as the client sees it via command-center View-as-client. Four guarantees verified in code: server-side read-only (12 write endpoints 403 impersonated sessions, single-point enforcement in client-auth.js), 30-min hard expiry, mint+use audited to operator_events, non-escalating (ADMIN_KEY-gated rate-limited mint, sha256 one-time exchange tokens, no admin reach). Migration 0016 remote, all 10 suites pass, deployed + live-verified. Hands-off queue after this: Kit email composer (compose+tags UI now, real send activates when a Kit key is stored in integrations). Blocked-on-founder unchanged: media galleries (YouTube/IG OAuth), email rail (domain), payment webhook (rail choice).

## [2026-07-16] build | Operator Kit email composer LIVE

The operator console now has an Email surface for the active client: real Kit v4 tag loading, draft storage, tag-targeted broadcast scheduling, and a recent draft/sent/failed ledger. Migration 0017 is live on `pulsify-portal`. Every send stores the full email before calling Kit; a missing key, rejection, or network failure preserves the copy and records a delivery failure. Independent review fixed the required Kit preview text and numeric tag ID payload, repaired the I1 regression harness so it tests the canonical checkout, and made the impersonation 30-minute cap exact. All 11 suites passed. Production smoke passed for the Email markup, console wiring, ADMIN_KEY gates, portal login, Frank landing page, and impersonation gate. The operator Kit key is not configured, so draft saving is live and Send stays disabled. The hands-off queue is empty; YouTube/Instagram OAuth galleries, the email domain, and the payment rail remain founder-gated.

## [2026-07-16] build | Overnight autonomous run: carousel studio + retest loop LIVE (Sol builds, Claude review+deploy)
Stage 1: carousel studio in production Studio - generate in the 3 canonical structures (methodology/taxonomy/philosophy) with per-slide design direction, manual-mode prompt, draft->review->approve lifecycle, admin queue, Carousel 01/02/03 library (migration 0018). Stage 2: the retest loop - one-click hook retest from a leaking sequence (captures leak slide + old hook from real diagnostics), v1/v2 lineage on Performance rows, atomic winner resolution, insight strip reports active/resolved retests (migration 0019). Both reviewed (12 then 13 suites pass, isolation + impersonation read-only proven, additive migrations, 0 dashes), migrated remote, deployed, smoked. Composer close-out by desktop Codex independently verified beforehand. The dashboard now carries the full content engine loop in production: diagnose -> create (sequences + carousels) -> track -> retest -> replicate.

## [2026-07-16] decision | Acquisition-page manager and lead attribution

Rebuilt the operator's Pages sent surface as an Acquisition pages card library with a quick-create modal, per-card views and video signals, active/inactive controls, and a detailed visitor drawer. Migration 0020 adds a private per-page token and optional prospect email so a tracked share URL can attribute page and Wistia activity before the prospect applies. Dashboard links use operator-preview mode and do not log views. IP, geo, and user agent are retained as supporting evidence, not treated as identity proof. All 13 suites and desktop/mobile browser acceptance passed. Migration 0020 and deployment `ff685b97` are live on `pulsify-funnels`.

## [2026-07-15] client-update | Warm-lead follow-up queue LIVE

Added an ADMIN_KEY-gated follow-up queue to the operator Pages sent surface. The queue ranks real viewers by page activity, watch depth, plays, and recency, joins application and booking outcomes, hides applied and booked prospects by default, and reuses the existing activity drawer. No migration was needed. Independent review passed the new acceptance suite and the view-tracking regression before deployment to `pulsify-funnels`.

## [2026-07-15] decision | Slack operating system established

Established Slack as the visible coordination mirror while the vault remains canonical. Created the eight-channel lane map, STARTED/DONE/BLOCKED/DECISION/HANDOFF message contract, privacy boundaries, source-of-truth split, bot-wakeup limitation, and daily briefing automations. The durable rules live in `SLACK_OPERATING_SYSTEM.md`, `AGENTS.md`, and `CLAUDE.md`.

## [2026-07-15] client-update | Native proof-image upload LIVE

Completed token-scoped proof-image upload from onboarding through the operator Brain view. The path validates PNG, JPEG, WebP, and GIF MIME plus file signatures, enforces a 10 MB cap, stores UUID-keyed objects in client-prefixed R2 paths, preserves captions and permissions in `proof_items`, serves media through `/m/`, and removes only the target client's objects during deletion. The proof-media suite and client-brain regressions passed before the R2 binding and production deployment.

## [2026-07-18] lint | Sprint leak cleanup and focused wiki audit

Closed the remaining 2026-07-13 through 2026-07-16 record gaps, independently reviewed acquisition pages with all 13 suites and 13 JavaScript syntax checks passing, archived the completed Codex task specs, and replaced `wiki/lint-report.md` with a focused post-sprint report. The lint found stale future-tense portal architecture, an impersonation-visibility contradiction, stale client-brain proof infrastructure notes, an effectively orphaned client-brain spec, and index freshness gaps.

## [2026-07-18] client-update | Operator Links directory

Added an ADMIN_KEY-gated Links route to the operator console plus a compact quick-links block on the Command center. The directory groups client access, internal tools, legacy and infrastructure destinations, and prospect pages loaded dynamically from the existing Acquisition pages data so active-state changes and new pages stay in sync.

## [2026-07-21] ingest | Thumbnail layout patterns and the quiet-text ruling

Ingested 20 founder-supplied reference thumbnails into `raw-sources/inspiration/thumbnail-retouch-references/` and extracted them into the new canonical page [[content-engine/thumbnail-layout-patterns]]. Four patterns emerged: raw photo with no text, board breakdown, screen recording with a webcam-style inset, and two people in a real location. Four of the references are the same founder photo at four degrees of retouch, which fixed the identity-lock standard: person untouched, real room tidied rather than replaced, no zoom, slight contrast lift, zero text.

Founder ratified the text ruling: the yellow bar survives on board breakdowns only, where the headline is structural because a board cannot be read at 120px. Raw photo, screen recording and two-person thumbnails go quiet. Hype adjectives, exclamation marks, shock faces and stacked numbers are banned across every pattern. Narrowed the scope of [[content-engine/thumbnail-photo-cleanup-prompts]] prompt 2 and of the "do not soften it" line in [[content-engine/ai-content-workflow-thumbnail-profile]], and cross-referenced the new page from [[content-engine/packaging-rules]].

Flagged an unresolved contradiction on packaging rule 5, no income screenshots as thumbnails: five of the twenty approved references are revenue or payout interfaces used as the thumbnail. The distinction that appears to hold is auditable live interface versus decontextualised flex, but that is not yet ratified and rule 5 stands until it is.

Also wrote `assets/thumbnail-retouch-spec.json`, the machine-readable retouch contract for handing to Codex or an image model, and rebuilt the FITFO prospect asset around the screen-recording pattern.

## [2026-07-21] decision | Income-screenshot rule resolved: the coupling is the variable

The founder ruled on the contradiction flagged earlier today. A real figure on a real interface shown on YouTube is blunt transparency and it is catchy, so it ships. Numbers only become obnoxious when coupled with watches, cars, or lifestyle, at which point the figure stops being evidence and becomes a status claim.

Rewrote [[content-engine/packaging-rules]] rule 5 from the blanket "no income screenshots as thumbnails" to the coupling rule, and recorded it in [[content-engine/thumbnail-layout-patterns]] under Pattern C. Still banned: a figure with no interface behind it, a number the creator cannot show inside the video, any figure paired with a lifestyle signal, and hype framing around it. [[concepts/trust-recession]] needed no change; it already scoped this correctly as "income screenshots without context or audit trail", so the overly broad version existed only in packaging-rules.

Unblocks the FITFO payout thumbnail, which was the last item gating that asset.

## [2026-07-21] decision | Prospect asset doc layout locked

Registered the FITFO document layout as a reusable standard at [[playbooks/prospect-asset-doc-standard]], with `output/fitfo-doc-build-short.js` as the canonical implementation. Fill-in rather than redesign, same rule as the landing-page standard.

The tokens: Georgia throughout with Consolas reserved for literal strings the prospect copies, a 6.1in measure at roughly 72 characters, Pulsify blue darkened to #4A53D9 for small-text contrast on white, and a hairline rule under every h1. Calibri is banned outright because it reads as a default Word document, which was the first build's real problem.

Structure is eight parts: title, the finding, an evidence table of their own assets, what works, what costs them, the numbered rebuild, untouched references, optional extra ideas. No CTA, per the founder ruling that a close offering free labour on demand positions us as a vendor auditioning rather than an operator.

The section that matters most is verification. Four versions shipped before anyone rendered the document, and every layout defect found afterwards was invisible in the source: a 95-character measure, a label colliding with its own value, doubled paragraph gaps, an orphan page carrying two lines. The page now carries the working toolchain for this machine, Word COM to PDF then pymupdf to PNG, since LibreOffice is absent and the docx skill's soffice shim is Unix-only. Also recorded: check the page count after every change, hash-check the shipped file against the rendered one, and kill lingering WINWORD processes before copying or the copy fails silently.

Known gap: nobody has yet opened one of these in Google Drive to confirm the conversion holds.

## [2026-07-28] client-update | FITFO deal restructured, and the July 26 IG batch audited

Read the WhatsApp thread with Carlos and the live IG inbox at the founder's request.

The FITFO deal moved and the vault was wrong. The 2026-07-24 structure of $2,000 up front plus 30% after the first launch no longer exists. Carlos soft-declined on Sunday, ruled price out a second time when tested, rejected a $1,000 plus $1,000 split, and counter-offered nothing up front with the first $3,000 of his revenue going entirely to Abdullah. Abdullah accepted. Recorded as a superseding entry in [[clients/fitfo/decisions]] with the old entry left intact and the contradiction flagged.

The objection read from 07-24 held up. Carlos independently confirmed it is not price, in his words that it is about him and where he is at, which is the second confirmation of the fear-of-success reading rather than a cost objection.

Six things are undefined in the new deal: the base that "times 1.5" multiplies, what counts as revenue, what triggers payment, any time limit, the terms after the first $3,000, and the scope of the build. The trigger question was raised by Abdullah in the thread and never answered. Carlos asked for the conditions in writing and has not received them, so [[clients/fitfo/deal-conditions-draft]] now holds the draft with those six marked as founder decisions.

The structural exposure worth naming: payment now triggers on Carlos closing a $3,000 client, and Carlos has no offer, roughly 1,000 followers, and six weeks of posting. Both parties agreed on 07-24 that a launch cannot be rushed, so the build sits fully on spec until the thing they agreed to slow down actually happens.

IG batch audited at [[clients/_pipeline/ig-inbox-audit-2026-07-28]]. Twelve cold DMs on July 26, five replies, 42% against a near-zero rate on the April mass blast. Three said yes and none have received the promised audit. The most useful reply came from a growth operator who declined and then gave a specific teardown, including that the newest client result on the profile is from last year and that a $2 ad spend presented as proof reads as wasted money to an operator.

## [2026-07-28] ingest | acpire prospect asset built, first use of the doc standard outside FITFO

Diagnosed @acp1re from his live profile and built the asset he was promised. Founder's read going in was that the account is flashy lifestyle with no educational content and nothing to target. The profile says otherwise once the captions are read rather than the grid.

What he actually is: 2,442 followers, 29 posts, verified, Melbourne, founder of @empiretradingroom which describes itself as an invite only trading floor and is set to private. Micro niche is NQ futures and prop firms, tight enough to be real. Bio link goes to a public Discord invite.

The wound is a contradiction between positioning and plumbing, and it is entirely in his own words. Two of his captions tell people to apply, once to "join my discord and apply to learn from me" and once to "hit me a dm to apply for my group". There is nothing to apply to. Every click lands in the same open Discord regardless of who the person is, the DM route makes him the bottleneck, and Discord captures nothing he owns. He also references "the framework" in a caption and never names it, which is a unique mechanism sitting unbuilt.

Asset: `output/acp1re-the-door.docx`, built from `output/acp1re-doc-build.js`, copied off the FITFO short build per [[playbooks/prospect-asset-doc-standard]]. Two pages, rendered to PDF and read before shipping. One deviation from the standard, recorded deliberately: the evidence table is text on both sides rather than text plus screenshot, because the evidence here is verbal. His literal captions sit in mono on the left and where each one actually leads sits on the right. Screenshots would have weakened it.

Build note for the next person: `docx` was no longer installed anywhere on this machine, so the module was installed into the session scratchpad and the build run with NODE_PATH pointed at it rather than adding node_modules to the repo. Page-break tuning mattered as the standard warns. The first render orphaned rebuild item 1 at the foot of page 1, fixed with a page break before the rebuild heading, which splits the document into diagnosis on page 1 and prescription on page 2.

Gap left open: the students highlight has 8 slides and its contents could not be read, because the story video frames would not render through the browser capture. The asset refers to the highlight existing and makes no claim about what is in it.

## [2026-07-28] decision | Asset library opened, and acpire reworked one pillar upstream

Two founder directives, both standing.

**Log every asset and propose from the log.** New page at [[playbooks/prospect-asset-library]]. Every asset built for a prospect gets a row: what it treats, what it needs, who it was built for, and the founder's steer on that build. When the next lead asks for something, the proposal comes off that menu instead of being re-derived. Five assets are marked proven and four are marked proposed but not yet built, and the distinction is enforced, because presenting an unbuilt asset as shipped work is how the trust goes.

**The acpire diagnosis was one pillar too far downstream.** The first build was a funnel teardown: he tells people to apply and links an open Discord. True, and not the top problem. Founder's correction, which is straight out of [[concepts/pulsify-order-of-operations]], is that his content pillar is broken first. Across twenty nine posts he has never shown the work. His audience is buying the lifestyle and has never been given the chance to buy the expertise, so fixing the door while nobody knows what is behind it treats the symptom.

Rebuilt as `acp1re-the-missing-half.docx`. Same evidence-in-his-own-words method, retargeted: his captions on the left, what his audience has actually been shown on the right. Then the long-form suggestion, three title and thumbnail pairs from the titles-thumbnails skill, shorts cut from the long form, and the bio pointing at a channel rather than a Discord invite, with the room moving to second step. Three pages rather than two, traded deliberately for the extra scope.

Two judgment calls worth keeping. The titles skill carries a hard rule banning lifestyle angles; it was written against rented-Lamborghini flexing, not against a man filming in his own apartment, so his aesthetic was kept as the visual language while every title stays anchored to the work rather than the life. And the founder asked us to position for the YouTube help he will need, which collides with the standard's no-CTA rule. Resolved by showing the roadmap exists and never offering to run it, so the doc demonstrates the capability instead of pitching it.

Register across the whole document is suggestion rather than instruction, per the founder: "you could" instead of "do this, and I want this from you." Numbers are left as open slots where his own figure belongs, because inventing one for a prospect breaks the same rule twice.

## [2026-07-30] client-update | FITFO 2026-07-29 terms call ingested, 30% finally on the record

Pulled the first of two Fathom calls from 2026-07-29 (57 min, Google Meet) via the browser and ingested it. The second call could not be retrieved: Fathom's web app stopped hydrating mid-session, home page included, so `clients/fitfo/calls/` currently holds call 1 only.

The headline is that the exposure flagged on 07-28 is closed. The 30% appeared nowhere Carlos had seen; on this call Abdullah recapped it and asked "Afterwards, 7030 applies. We cool?" and Carlos answered "Yeah, makes sense" at 26:07. Carlos also asked for the recording himself, so sending it converts the verbal agreement into a record he has received. The 5/10/15 internal split is also on tape, and Carlos worked the math out loud, misread it once, and confirmed his corrected understanding, which removes the misunderstanding defence.

The most valuable thing Abdullah did was refuse to defer. Carlos proposed settling the percentage after the $3,000 cleared, floating "70, 30, 80, 20, 60, 40, whatever makes more sense in that moment." Abdullah declined: everything gets locked now. Under Carlos's version Pulsify would have renegotiated holding a finished build and no signed continuation.

One number is unresolved and it is the load-bearing one. Abdullah's recap is garbled on the recording ("the two K off three K when you get the first three... 20k generated"), Fathom's AI summary rendered it as $3k out of the first $20k, and Carlos's own words twice describe first-dollars priority with no $20k gate. Flagged as a contradiction rather than resolved, because the two readings change when Carlos starts drawing money.

Also settled: Instagram stays his with no scripted reels (Pulsify gets bio, visuals, suggestions, and a brand-harm veto Carlos granted unprompted), YouTube is fully open to Pulsify structuring on titles, topics, length, and required beats, the funnel choice stays deferred to whichever platform performs, and the tooling stack is Slack, WAP/Fanbases, shared calendar, client portal, and his own AI subscription.

Three risks recorded rather than smoothed over. Abdullah answered a direct "do you really see this working for more than $10,000 a month" with yes, which is a verbal projection on a deal with no written floor. The authority-photo direction anchored on Iman Gadzhi and, while the obvious flex was explicitly ruled out, the examples shown were Rolex, a fancy mall, and a hotel, which drifts toward the lifestyle proof currency the ratified dial bans. And the scope grew on this call while the payment trigger stayed pinned to a launch that needs an offer Carlos does not have, with still no lapse date.

Files touched: `clients/fitfo/calls/2026-07-29-call-1-raw-transcript.txt` (new), `clients/fitfo/calls/2026-07-29-terms-lockdown-call.md` (new), `clients/fitfo/decisions.md` (four new entries), `clients/fitfo/deal-conditions-draft.md` (items 3, 5, 6 resolved; 2 and 4 sharpened), `clients/fitfo/overview.md` (new, structure was missing since 07-24), `clients/fitfo/progress.md` (new, same), `AGENT_CHAT.md` (lock board).

## [2026-07-30] client-update | FITFO call 2 ingested, termination clauses now the open exposure

Founder pasted the full transcript of the second 2026-07-29 Fathom call directly (46 min) after the browser-based retrieval that worked for call 1 failed on call 2 — Fathom's web app stopped hydrating entirely, home page included, and never recovered in that session. Call 2 is a direct continuation of call 1, picking up mid-sentence in the Instagram algorithm walkthrough after the first Meet link expired.

Two things move. First, the $3,000 trigger ambiguity flagged after call 1 is closed: Carlos restated the deal himself at 31:12, unprompted, "we sign on the 7030 and then the 3k upfront before I get any money," and Abdullah confirmed "Perfect." Both parties have now independently stated first-dollars priority in their own words, which retires the $20k reading Fathom's AI summary had introduced from a garbled recap.

Second, and more consequential: Carlos asked directly for termination clauses at 29:02, naming his own trigger (three months, results nowhere near expectation, he walks) and three specific conditions — he wants to keep the systems, no time bind, and no obligation to pay the $3,000 as a condition of leaving. Abdullah answered with how the Nick engagement ended and an appeal to good faith, not a clause. Combined with the scope expansion recorded on call 1, this leaves every category of risk sitting on Pulsify's side: no upfront, no time floor, no lapse date, and a counterparty on record asking not to be bound to the deal's only payment. Filed as the new top priority in the conditions draft, with a recommended structure that satisfies everything Carlos asked for by name (the $3,000 obligation survives termination only against revenue he actually collects in a defined window; if he never launches, he owes nothing and keeps the systems) while still closing the hole.

Real content numbers landed for the first time in his file: a reel at 4.2M-5.4M views that converted to an estimated 500-600 followers, story views in the 50-200 range, and roughly 30 inbound DMs over a month and a half. The diagnostic worth keeping is the reach-to-follower ratio on that breakout reel, which is concrete evidence for the IG-to-YouTube depth argument rather than a claim. Content decisions also firmed up: kill the Linktree, drop "free" from any mentorship language, YouTube gets bullet-point bodies with scripted hooks/CTAs only, Shorts and Twitter both deprioritized by mutual agreement rather than unilaterally.

Two things flagged rather than acted on. Abdullah told Carlos the contract is "already done by a lawyer" — nothing in the vault supports that for a document matching this deal's actual terms, and the v1 template still doesn't fit a zero-base performance deal. And Abdullah disclosed on the recording, unprompted, that he still retains a former client's (Nick's) government ID and national ID number from a prior WAP onboarding — a real liability now on tape in a recording Carlos holds, logged as a data-retention item in decisions.md.

Doctrine filed: `wiki/playbooks/pulsify-offer-v1.md` gets a second rule alongside the deferred-renegotiation one from call 1 — answer a termination-clause question with a clause, not a reassuring anecdote, and separate what the prospect actually objected to from what he never objected to before conceding ground.

Files touched: `clients/fitfo/calls/2026-07-29-call-2-raw-transcript.txt` (new), `clients/fitfo/calls/2026-07-29-content-audit-call.md` (new), `clients/fitfo/decisions.md` (3 new entries), `clients/fitfo/deal-conditions-draft.md` (item 3 fully closed, item 4 rewritten as the top priority, structure section updated), `clients/fitfo/overview.md`, `clients/fitfo/progress.md` (real metrics added), `wiki/playbooks/pulsify-offer-v1.md` (second doctrine entry), `AGENT_CHAT.md` (lock board).

## [2026-07-30] decision | FITFO termination resolved: mutual at-will exit

Founder reported the termination question (the top open exposure from the 07-29 call-2 ingest) is agreed: mutual at-will exit by message, either side can stop at any time for any reason, no penalty, Carlos keeps the systems. Recorded in clients/fitfo/decisions.md and the conditions draft. This is the right structure and matches Carlos's asks. Flagged one gap the at-will framing skips: it answers "can either side stop" but not "what happens to revenue in flight at exit." Recommended two narrow additions that keep the clean exit — $3k recovered from revenue already collected before exit, plus a 30-60 day tail only on pipeline deals at termination — while explicitly NOT binding Carlos to future solo income, because the 30% is pay for operating the machine and stopping the work fairly stops the pay. Files: clients/fitfo/decisions.md, clients/fitfo/deal-conditions-draft.md, clients/fitfo/overview.md.

## [2026-07-30] decision | Claude strategizes, Codex builds; Slack automations retired

Founder reaffirmed the minimal operating split. Claude remains the default LLM and owns thinking, research, planning, specifications, copy judgment, and review. Codex owns agentic coding, implementation, testing, verification, automation implementation, website builds, and deployment from Claude's direction. This split is permanent rather than conditional on Fable access. When Claude is near a session limit, Codex does not call it unless the founder explicitly asks.

Slack itself remains available but is no longer part of the required operating loop. Mandatory Slack mirrors and the morning/evening briefing automations are retired and must not be recreated without a new founder instruction. The repo remains canonical through `AGENT_CHAT.md`, git, the wiki, and client files.

Immediate operating priority: work the Instagram leads already waiting in the pipeline, build the promised prospect assets, and only then return to product building. The founder's language was direct: the leads have rested too long.

## [2026-08-02] decision | The horizon note: follower count is not the constraint

Founder directive during the `_acetrades_` asset build. Creators in the 500 to 5,000 follower band read their follower count as the reason nothing converts. It is the wrong diagnosis and it is the one that makes them abandon a working system three weeks in. Every prospect asset now closes with a short paragraph naming that belief before they voice it, reframing the constraint as foundation rather than volume, and setting the time expectation honestly. No promised timeline, no numbers, no flattery, no strings. It occupies the space where a CTA is banned, which is why it can sit at the close without turning the document into a pitch.

Anchor it in real evidence from their own account wherever possible, audience quality being the strongest anchor. A stranger writing a detailed technical comment turns the reframe from encouragement into an observation.

Also recorded five proposed upgrades to the doc standard from the same session, unratified: page one stands alone, the falsifiability test on the finding, naming what we deliberately left alone, sending behind the live `/a/{token}` tracked link, and outcome columns in the build log. That last one matters most. Three assets exist in the library and none has reply data, so the standard is being refined on craft rather than results.

Files touched: `wiki/playbooks/prospect-asset-doc-standard.md` (new horizon-note section, structure part 9, upgrades-queued list), `wiki/playbooks/prospect-asset-library.md` (horizon note added to what every asset must hold, dormant-channel-repackage asset added, build log row), `outreach/intel/acetrades.md` (new), `AGENT_CHAT.md`.

## [2026-08-02] ingest | _acetrades_ prospect intel opened

New lead record at `outreach/intel/acetrades.md`. Verified day-trading account, first founder capture is a June 29 reel with the comment rail open. The content pillar reads healthy: raw screen recording of a real annotated chart, face cam, hoodie, zero lifestyle. The strongest visible asset is a 356-like comment from a viewer who back-tested his method and wrote a full technical breakdown of it in public, unpaid, in a thread that disappears.

Three candidate wounds, none confirmed: the mechanism has no name (it is labelled "Sauce" and `#sauce`), the method has no permanent home (a YouTube channel exists but stopped four months ago), and the caption sells nothing while the CTA sits in his own comments pointing at a free Discord. Per the acp1re correction the Discord observation does not outrank the content diagnosis without more evidence.

Awaiting from the founder: feed grid, highlights, bio and link destination, reel transcripts, view counts, YouTube channel URL. No build starts until the source set is complete.

## [2026-08-02] lint | Obsidian install verified, vault link health audited

Obsidian is installed and connected on the Lenovoi laptop. The vault is registered at the real repo path and was open at the time of the check. Graph, backlinks, outgoing links, tag pane, properties and search are all enabled, so the `[[wiki-link]]` discipline the vault has been maintained under is now actually readable as a graph. `.obsidian/` is tracked in git, so the configuration is covered by the backup repo.

Ran a full link-resolution audit: 1,918 wikilinks across the vault, 72 unresolved instances before the fix, 53 after. Found and repaired one real rename-orphan: `[[concepts/pulse-system]]` was cited 19 times across 8 files but the page has been named `pulse-system-mechanism.md` for some time. All 19 retargeted. The bulk of what still fails to resolve is deliberate template placeholder syntax rather than rot.

The one genuine gap left is a set of `raw-sources/` documents that pages cite but that were never filed into the vault: the lead-sourcing SOP, the first Alexei transcript, both PulsifyMedia MSAs, the creator-profile prompt template, and the thumbnail-retouch references. Those are cited claims with no source trail behind them, which is exactly what the source-trail rule exists to prevent.

Files touched: `codex-handoff.md`, `wiki/content-engine/next-video-sales-funnel-automation.md`, `wiki/playbooks/claude-codex-collaboration.md`, `wiki/playbooks/pulse-system-outreach.md`, `wiki/synthesis/ai-infrastructure-positioning-patterns.md`, `wiki/synthesis/operator-vsl-study-map.md`, `wiki/synthesis/personalized-cold-outreach-vsl-architecture.md`, `wiki/synthesis/vsl-pattern-lab.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-02] decision | Prospect asset SOP: the pipeline, and two permanent tools

Founder asked for a standard procedure after `_acetrades_` and `tb.tradez` were built back to back. Both builds rediscovered the same steps, rewrote the same three throwaway scripts, and the TB document was rebuilt four times before the shape was right. The craft was settled; the pipeline was not.

New page at `wiki/playbooks/prospect-asset-sop.md`, five phases. Collect (scrape, log every source into the intel file first, look at thumbnails at full resolution before anything else). Diagnose (which pillar, score the five conversion assets, which trust stage, is the mechanism theirs, find the idea they own and have not named, one-sentence leak, then give the founder the read before building). Build (copy the last script, four lines of observation then four fifths built work, under 1,500 words). Verify (the checker, then actually look at the rendered pages). Ship and log (Drive, then the build log and the outcome).

Two throwaway scripts became permanent tools. `tools/pull_creator_assets.py` scrapes a YouTube handle for video IDs and downloads every thumbnail at max resolution into the prospect's Desktop folder; this is the step that produced the strongest finding in both builds. `tools/check_prospect_doc.py` runs the pre-send checks: banned glyphs, the AI-tell patterns from the copy voice guide, stray placeholders, image count, and word count against the 1,500 ceiling. Tested against the TB v4 doc, passes clean.

Three doctrine sections also landed on `prospect-asset-doc-standard.md` from the same session, in the order they were given: a value asset is built work rather than a diagnosis (the governing one), lead with the framework rather than the audit, and ease in Ben Bader style then cut it in half.

The honest gap, recorded in the SOP: no reply data on any asset built so far, so all of this is craft-validated and none of it is results-validated. Word COM is still hanging on this machine so the render step falls to the founder.

Files touched: `wiki/playbooks/prospect-asset-sop.md` (new), `tools/pull_creator_assets.py` (new), `tools/check_prospect_doc.py` (new), `wiki/playbooks/prospect-asset-doc-standard.md`, `outreach/intel/tb-tradez.md`, `output/tbtradez-doc-build.py`.

## [2026-08-03] decision | Variant 02 promoted as the dark landing-page design

Founder promoted Variant 02 from a parked experiment to the second main landing-page design after a full visual rebuild. Canonical remains the light Frank-derived default. Variant 02 now uses the same Inter typography discipline and fixed conversion spine with a near-black base, restrained crimson-to-deep-purple gradient accents, black vector geometry, dark glass surfaces, and responsive proof/application states.

The source and deployed CSS copies are synchronized. The deployed HTML keeps the existing Wistia, Typeform, proof-feed, application visibility, and content-token contracts. Settings now labels it `Variant 02 (dark vector)` instead of an alternate direction. The old beige/teal, Instrument Sans, and Space Grotesk treatment is retired.

Verification: `i1-checks.mjs` passed, `proof-media.test.mjs` passed, `git diff --check` passed, and targeted contract/token/source-sync checks passed. The in-app browser refused local `file://` tab control under its security policy, so visual sign-off remains a founder refresh of the already-open local Variant 02 tab rather than an agent-captured screenshot.

Files touched: `assets/landing-page-standard/variant-02/index.html`, `assets/landing-page-standard/variant-02/css/style.css`, `output/standard-preview/templates/variant-02/index.html`, `output/standard-preview/templates/variant-02/css/style.css`, `output/standard-preview/settings.html`, `assets/landing-page-standard/README.md`, `wiki/synthesis/landing-page-standard.md`, `wiki/index.md`, `claude-memory/project_landing_page_standard.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Variant 02 geometry removed

Founder removed the geometric treatment from Variant 02. The background is now color gradient only. Deleted the decorative SVG plane from both HTML templates, the page grid and horizontal overlay, responsive vector positioning, video-placeholder diagonal/grid overlays, and proof-placeholder diagonal geometry. Typography, layout, grayscale palette, responsive behavior, and the Wistia/Typeform/proof contracts stay unchanged.

Both CSS copies are synchronized. A targeted audit found no vector selectors, pseudo-element geometry, mask/grid background images, or SVG vector markup in the actual template. `i1-checks.mjs`, the funnel contract assertions, and `git diff --check` passed.

Files touched: `assets/landing-page-standard/variant-02/index.html`, `assets/landing-page-standard/variant-02/css/style.css`, `output/standard-preview/templates/variant-02/index.html`, `output/standard-preview/templates/variant-02/css/style.css`, `assets/landing-page-standard/README.md`, `wiki/synthesis/landing-page-standard.md`, `claude-memory/project_landing_page_standard.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Variant 02 recolored to black gradient and white

Founder replaced Variant 02's crimson/deep-purple treatment with a strict monochrome system. The structure, Inter typography, black vector geometry, responsive layouts, and Wistia/Typeform/proof contracts stay unchanged. The live design tokens are now grayscale only: layered black backgrounds, white-to-graphite headline and CTA gradients, white controls, neutral glass surfaces, and white structural edges.

Both template copies are synchronized and the Settings picker now labels the option `Variant 02 (black gradient)`. A strict audit confirmed every hex and RGBA color in the actual template is grayscale; no crimson or purple token remains. `i1-checks.mjs`, `proof-media.test.mjs`, and `git diff --check` passed.

Files touched: `assets/landing-page-standard/variant-02/index.html`, `assets/landing-page-standard/variant-02/css/style.css`, `output/standard-preview/templates/variant-02/index.html`, `output/standard-preview/templates/variant-02/css/style.css`, `output/standard-preview/settings.html`, `assets/landing-page-standard/README.md`, `wiki/synthesis/landing-page-standard.md`, `wiki/index.md`, `claude-memory/project_landing_page_standard.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Variant 02 dark-gold comparison preserved separately

Founder kept the approved monochrome Variant 02 and requested a separate visual comparison with dark gold. Added `assets/landing-page-standard/variant-02-gold-preview/` as a local-only concept. It preserves the geometry-free layered black background and full HTML integration contract, then introduces restrained antique-gold emphasis and a broad low-intensity dark-gold shadow behind the video. The approved Variant 02 source, deployed copy, live picker, and production renderer are unchanged.

Verification passed: `i1-checks.mjs`, `proof-media.test.mjs`, approved-base immutability, HTML contract parity, geometry exclusion, targeted gold-treatment assertions, and full diff self-review.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/index.html`, `assets/landing-page-standard/variant-02-gold-preview/css/style.css`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Gold preview gradient changed to gold-only

Founder removed the white and champagne stops from the experimental gold preview's shared accent gradient. Headline emphasis, CTAs, play control, and Typeform progress/control accents now transition only through muted light gold, antique gold, and deep gold. Ordinary white body text remains white. Approved Variant 02, the live picker, and production templates remain unchanged.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/css/style.css`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Gold preview gradient centered

Founder rejected the directional/angular treatment in the experimental gold preview. Replaced the shared 135-degree linear accent gradient with a centered radial gradient using the same muted light gold, antique gold, and deep gold stops. This affects headline emphasis, CTAs, play control, and Typeform accent controls without changing layout, content, integrations, the approved Variant 02, or production.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/css/style.css`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Filled Frank mockup added to gold preview

Founder approved the centered gold direction and requested a mockup. Added a standalone local `mockup.html` inside `variant-02-gold-preview` with a dedicated poster treatment and the existing Frank video image. Copy comes from the verified Frank Wieler student-interview profile: his youngest mentorship student built nearly $1M in revenue at 15, and two subscription products reached roughly $100K peak MRR. The page does not invent program price, curriculum, delivery structure, or guarantees. Proof tiles remain clearly labeled mockup slots.

The generic tokenized gold preview, approved monochrome Variant 02, live picker, and production templates are unchanged. Verification passed for zero unresolved tokens, verified claim markers, static mockup isolation, poster presence, base-file immutability, regression suite, trailing whitespace, and full diff self-review.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/mockup.html`, `assets/landing-page-standard/variant-02-gold-preview/css/mockup.css`, `assets/landing-page-standard/variant-02-gold-preview/assets/frank-product-video.jpg`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Frank gold mockup fully centered

Founder centered the standalone Frank gold mockup. The mockup-specific stylesheet now centers the brand row, audience pill, hero copy, CTA group, video frame and metadata, section headings, application frame and skeleton, proof-slot labels, closing section, and footer on desktop and mobile. The generic gold preview, approved Variant 02, picker, and production remain unchanged.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/css/mockup.css`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Mockup buttons darkened and shortened to Apply now

Founder rejected the pale center in the standalone mockup's buttons. The mockup-specific button gradient now starts at antique gold and deepens through dark gold, with the bright white inset highlight replaced by a muted gold highlight. This applies to the two primary CTAs, play control, and Typeform next control while leaving the headline gradient unchanged. Both main CTAs now read `Apply now`.

The generic gold preview, approved Variant 02, picker, and production remain unchanged.

Files touched: `assets/landing-page-standard/variant-02-gold-preview/mockup.html`, `assets/landing-page-standard/variant-02-gold-preview/css/mockup.css`, `assets/landing-page-standard/README.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Gold mockup retained and communicated to Claude

Founder explicitly asked to keep the finalized gold landing-page mockup in the shared files and communicate it to Claude. Recorded the full state and status boundary in `claude-memory/project_landing_page_standard.md`, `wiki/synthesis/landing-page-standard.md`, and the shared `AGENT_CHAT.md` channel. The retained artifact is `assets/landing-page-standard/variant-02-gold-preview/mockup.html` with its mockup-only stylesheet and Frank poster asset.

The design is retained as a candidate/mockup, not promoted. It is not a third main design, is absent from the picker and production, and must not replace monochrome Variant 02 without a new explicit founder instruction.

Files touched: `claude-memory/project_landing_page_standard.md`, `wiki/synthesis/landing-page-standard.md`, `wiki/log.md`, `AGENT_CHAT.md`.

## [2026-08-04] decision | Prospect assets: three builds, five doctrine rulings, two permanent tools

Three prospect assets built back to back (`_acetrades_`, `tb.tradez`, `lukextrades`) and the doctrine that came out of them. Every ruling below is the founder's, recorded in the order given.

**A value asset is built work, not a diagnosis.** The governing rule. "Here is what I built for you, and here is where you could go differently," never "here is everything wrong with a framework attached." Observation gets four lines near the top; four fifths of the page is finished output. In the Luke build that meant a rewritten description, five video titles with thumbnail specs and outlines, three of his own thumbnails against a rule derived from his own data, a replacement landing page with the VSL beats and six application questions, and two rendered previews of that page in his own copy.

**Lead with the framework, not the audit.** Details earn a line, never a section. The frameworks in `synthesis/cross-creator-synthesis` and `frameworks/instagram-conversion-assets` drive what gets built but stop being visible as headings. A fabricated phone clock reading 1:89 is one sentence, and what follows it is the framework reason it matters: a number in marketing attracts people earning a third of it, so a seven-figure figure attracts nobody who actually trades.

**Ease in, Ben Bader style, then cut it in half.** Opening on a framework reads as though the reader missed page one. Hook on something they recognise from their own life, a beat of white space, then the bridge. TB v2 was 1,719 words; v3 was 1,203 with every section intact.

**Stats read as pain when the creator already knows them.** Luke's 1,500 videos against 1,520 subscribers was the opening of v1. Founder ruling: he is aware of his position, that framing only inflicts pain, and it belongs at the close as a light sign we paid attention or not at all. The comparison was cut and the 44-uploads-a-week line became the closing note.

**Do not rewrite a broken page, propose the real one.** Rewriting the copy on a Carrd page with no video, no proof, no price and no form is polishing a dead end. Say plainly it needs replacing and spec the VSL page with the application embedded.

**It has to flow like an email.** Sections reference each other in the reader's own logic rather than landing cold. A stack of tips reads as a list anyone could have written; the same tips connected read as a system, and the system is what people pay to have installed.

**New this session:** `wiki/playbooks/prospect-asset-sop.md`, the five-phase pipeline, now with a landing-page-preview phase. `tools/pull_creator_assets.py` scrapes a YouTube handle and downloads every thumbnail at max resolution, the step that produced the strongest finding in two of three builds. `tools/check_prospect_doc.py` runs pre-send checks and enforced the 1,500-word ceiling three times during the TB build. Headless Chrome solved the rendering problem that had been open for weeks; the exact invocation and its three gotchas are in the SOP.

**Landing pages:** founder called in the gold skin at `assets/landing-page-standard/variant-02-gold-preview/` for prospect previews, which overrides Codex's candidate-only boundary for that use. A Codex cross-call confirmed no dark landing page existed at the time I searched; variant-02 was rebuilt dark at 03:30 that morning, after the search.

**The follow-up gap, now filled.** Two prospects received assets and went silent. The cause is structural: the doc has no CTA by design and the first DM asks for nothing, so nothing in the sequence gives the prospect a reason to type. Three follow-up drafts are now in `content-engine/cold-dm-formula.md` with the recommended one flagged, at 3 to 5 days, marked untested.

**The standing gap:** three assets exist and none has reply data. Every rule above is craft-validated and none of it is results-validated. Until that changes the build log's outcome columns are the highest-value thing anyone can fill in.

Files touched: `wiki/playbooks/prospect-asset-doc-standard.md`, `wiki/playbooks/prospect-asset-sop.md`, `wiki/playbooks/prospect-asset-library.md`, `wiki/content-engine/cold-dm-formula.md`, `outreach/intel/lukextrades.md`, `outreach/intel/tb-tradez.md`, `outreach/intel/acetrades.md`, `tools/pull_creator_assets.py`, `tools/check_prospect_doc.py`, `output/lukextrades-doc-build.py`, `output/tbtradez-doc-build.py`, `output/acetrades-doc-build.py`, `output/lukextrades-preview/`.

## [2026-08-04] decision | First reply data: a booked call, and the "I already knew that" signal

**The first outcome on any prospect asset.** The founder followed up a ghosted lead using the Option A follow-up and it booked a call. That is the first evidence that any part of this pipeline converts, and it validates the follow-up specifically rather than the doc.

**The other reply is the more useful one.** A different prospect came back with, in substance, "I already knew that." Recorded here because it is the single most actionable piece of feedback the outreach motion has produced.

Read: this is not a length complaint and shortening will not fix it. A meaningful share of what these documents contain is category advice any switched-on creator has already heard, and reading it aloud or cutting it in half leaves that share intact. What survives the test is only what we could see and they could not: the 1:89 clock across four of TB's thumbnails, the stranger who back-tested Andersen's setup in his own comments at 356 likes, Luke's best video being seven minutes rather than the fifty-six-minute one, Andersen's teaching reels beating his money reels four to one on his own grid.

New cut rule, tighter than the falsifiability test already on the doc standard: **delete everything the prospect could have known without us, keep only what we found by looking.** Applies to whole sections, not sentences.

**Format shift, founder-proposed and agreed with one correction.** The founder proposed a Loom of himself reading the document. A video of someone reading a document is a flatter format than the document, and it does not answer "I already knew this," it only makes them sit through it. The version that works is a screen-share of *their* account with him talking over it: scroll the grid, point at the two numbers, open a thumbnail at full size. Ninety seconds to three minutes. That cannot be dismissed as generic because it is their own screen, and it moves trust several stages at once because they hear and see him.

**Delivery correction:** send it as a native video file in the Instagram DM, not a Loom link. Instagram plays uploaded video inline; a Loom link is a click out of the app to a stranger's domain, which is exactly the click a skeptical prospect will not make. Record in Loom if convenient, download the mp4, send the file.

**The document survives but gets demoted.** The video earns the reply, the document is the leave-behind. Currently the doc is doing both jobs and it is the weaker opener.

**Carlos:** founder is standing down on the FITFO deal for now, judged too much hassle for the return. Not closed, parked.

## [2026-08-13] ingest | bergtrades prospect asset built

Founder supplied the Loom transcript, IG and DM screenshots and three full video transcripts for Matthew Bergin (@bergtrades.ig, 10K). Scraped both YouTube channels for real titles and view counts, pulled 30 thumbnails at max res, and read both offer pages plus the application form.

The diagnosis inverted the founder's Loom read. The Loom called the thumbnails weak and asked for better design. The channel data says his best-performing thumbnails are raw unedited screen grabs and his worst are the polished ones: every frame carrying a readable document did 500 to 1.2K, every designed graphic with a single word did 62 to 373. His two newest are the same file with one word swapped, carrying the same recycled +120.4R stat. Same month, he removed bergsmentorship.com from his video descriptions and replaced it with a linktw.in shortener, leaving five affiliate links above his own offer. Spine of the doc: his proof and his teaching are on the wrong surfaces, since thetradingclub.uk carries seven named student transformations and none of them are videos.

Also found his unnamed unique mechanism, stated once in a transcript and nowhere else: a mechanical model makes the mentor auditable, so his students can check his results against their own in a way a discretionary mentor cannot.

Two documents built, rendered and read: `bergtrades-the-proof-is-on-the-wrong-page.docx` (1,185 words, 3 pages) and `bergtrades-vsl-rewritten.docx` (893 words, 2 pages), both on the Desktop under `Prospect Assets\bergtrades\`. Build script at `output/bergtrades-doc-build.py`, intel at `outreach/intel/bergtrades.md`.

Three vault updates fell out of it. The Word COM render blocker in [[playbooks/prospect-asset-sop]] is cleared, with the working recipe recorded. [[frameworks/vsl-framework]] carries a contradiction flag: its six steps do not match the raw Jeremy Haynes source and the raw order was used for the build. [[playbooks/prospect-asset-library]] has the new build-log row.

Not sent. Awaiting founder review.

## [2026-08-13] client-update | Pulsify's own IG: start-here sequence + methodology carousel

Founder asked for a story sequence for his highlights and a carousel, both against the captured Niksetting frameworks. Confirmed what the vault actually holds before drafting: [[frameworks/story-sequence-system]], the 18-slide [[content-engine/sequence-breakdowns/niksetting-new-here]] teardown, [[content-engine/sequence-carousel-design-system]] and [[frameworks/carousel-system]]. Nothing in the vault matches "harmonize" - the only hit is inside a SooWei transcript and it is not a framework. Flagged rather than guessed.

Two assets built. [[content-engine/pulsify-start-here-sequence-v1]] is the transformation sequence, 12 slides, every number pulled from the authority anchors in [[people/abdullah-dagestani]] and nothing invented. Two deliberate calls: the transformation on show is capability rather than money (founder's own constraint, and the only version that survives a prospect checking), and slide 7 admits the Nick churn with the blame on the founder for never setting the timeline expectation.

[[content-engine/pulsify-methodology-carousel-v1]] is the methodology-as-document carousel: the labor-layer wedge, then the five Pulse System pillars, then a CTA that routes the reader into the start-here highlight. Founder ruled out the taxonomy structure for now on the correct read that reach plays need reach.

Two founder rulings recorded. No trigger word on either CTA at zero audience: everyone reaching these assets arrives from a cold DM already open, so a trigger word is friction on a live conversation. Re-add it when reels start pulling strangers. And the transformation story stays in stories only, not duplicated to the grid.

One open constraint: Pulse System pillars 4 and 5 have no client artifact because no client has run the full v1 mechanism end to end. Resolved by using the founder's own CRM and operator console, labelled honestly as his own, rather than staging a client dashboard that does not exist.

Awaiting founder photos against the two shot lists. Cover number attribution on the carousel ($96k, one client or several) needs confirming before publishing.

## [2026-08-13] decision | prospect assets become designed pages

Founder directive after reviewing the bergtrades build: the asset stops being a document and becomes a designed page. His read was that the docx was bland and that "people really cannot read nowadays," and that we have been demonstrating our packaging ability with an unstyled Word file.

Governing principle recorded as build for a scroller, not a reader. Four things may never ship as prose again: every title appears beside its thumbnail, bio audits render as side-by-side Instagram profile mocks, packaging before-and-after is shown with real numbers as proof, and emphasis is designed rather than implied. Register shifts from operator briefing to selling, so the prospect finishes able to tell right from wrong in their own business.

New standard at [[playbooks/prospect-asset-visual-standard]]. [[playbooks/prospect-asset-doc-standard]] now carries a superseded-in-part banner: its layout half is retired, its writing rules stand.

Resolved the founder's link-trust objection from the build records rather than by guessing. OG preview cards and clean per-lead path URLs both shipped 2026-07-09, so a pasted link already renders a preview card and already carries the prospect's name. Two rules follow: never send these behind the `/a/{token}` redirect, because a redirect reads as more suspicious and the hosted page is already instrumented, and a custom domain is the last remaining piece and is a founder purchase decision.

Two content gaps blocked and flagged rather than filled. The packaging before-and-after case the founder references verbally has no recorded numbers or thumbnails anywhere, and `clients/fitfo/progress.md` confirms no YouTube baseline was ever captured. The $50M figure he wants attached to the VSL framework has no support in [[people/jeremy-haynes]] or anywhere else. Neither ships until sourced.

Codex build brief written to `CODEX_TASK_prospect_asset_page.md`. Not fired, awaiting founder go on the design direction.

## [2026-08-13] decision | pulsify-ai.com deferred until first revenue

Founder was at the Wix checkout for `pulsify-ai.com` ($7.90 first year, renews at $21.35/yr) and stepped back. Ruling: no domain purchase until Pulsify takes its first money. Until then he wants the cheapest domain available and will upgrade later.

Logged as a triggered reminder rather than a task. When the first client payment lands, the reminder to buy `pulsify-ai.com` fires unprompted, alongside the existing post-close onboarding trigger. Buy at a flat-rate registrar rather than a first-year bait price.

This is the same "custom domain" item flagged open in the 2026-08-13 prospect-asset ruling above, where a custom domain was named the last remaining piece of the link-trust problem on hosted prospect pages. It stays open by choice, not by oversight.

Second ruling in the same exchange: a cheap TLD cannot be made to display as a different domain. Whatever URL is pasted into a DM is the URL the prospect sees. Masked forwarding shows the cheap domain in the address bar anyway, breaks the OG preview cards shipped 2026-07-09, and reads as evasive. So whichever domain is bought is the real public domain until it is replaced.

## [2026-08-13] decision | founder correction on link trust, domain moves in front of revenue

Correction to the entry above. I argued that `pulsify-funnels.pages.dev` reads as neutral to a prospect because it is visibly Cloudflare infrastructure. The founder rejected that outright: nobody outside dev work knows what `pages.dev` is, so to a trader opening a cold DM it is an unknown domain with the same trust cost as a .info. Standing rule from it - never assume a prospect parses infrastructure.

Consequence recorded rather than the buy decision being changed. The domain sits in front of revenue, not after it, because every prospect asset is delivered through the link. Deferring it until first money makes the domain wait on revenue it partly gates. Argument put to the founder, decision left with him.

Mechanics confirmed for the record. The per-lead path URLs shipped 2026-07-09 already produce `/{lead-slug}`, so attaching a custom domain converts every link to `domain.com/frank-wieler` with no rebuild - a DNS change only. Buying at Cloudflare Registrar avoids a nameserver migration because Pages already hosts the project. A name-first form (`frank-wieler.domain.com`) is possible but needs wildcard DNS and Codex verification on Pages, so the path form stands as the zero-engineering option.

## [2026-08-17] decision | Close-section standard rewritten off the bergtrades rebuild

The proof-band pattern ruled 2026-08-16 is superseded in [[playbooks/prospect-asset-visual-standard]]. It was rejected in build: "this is not cutting it at all." Two failure modes recorded rather than just the replacement, because both are easy to repeat.

Sparse beat dense. A two-layer drifting band and then a scattered constellation both put eight objects in a large black stage, which reads as a moodboard and argues against this vault's own density principle. Second, the money was hidden: every figure sat inside a 200px screenshot, so the largest type in a section about $98,000 was the heading. The section never said its own number.

The standard is now: heading, the strongest figure set as type at up to 178px, its receipt screenshot directly beneath, the remaining metrics at a size where the numbers actually read on the page, then every client photo in one lit full-bleed row, over a background of those same photos tiled as the room. Two depths, one set of images, which is what lets the closing copy say "everyone up there" and have it land.

Three rules generalised out of it. Never dissolve people with opacity and blur, since blur and grayscale are what make a photograph read as a watermark; darken with exposure and hold legibility with a scrim. Anything that only reveals on hover is broken, because the prospect is on a phone, so every reveal is also driven by distance from the viewport middle. And verify contrast on a ground-only render with copy hidden, since sampling a normal render measures glyph antialiasing and returns nonsense.

Closing copy changed too. The old ending pitched a dashboard and portal and read as sales; founder's note was that it "triggers sales resistance where they stop seeing through the thing." It now opens on the shared diagnosis, and the diagnosis must be the one the asset already argued rather than a new claim.

Also added four send-link checks to the delivery section, after the bergtrades link failed three of them at the point the founder asked whether it was ready to send: a resolving `og:image`, `noindex`, no "preview" in the host, and a 200 check on every asset plus the CTA target. Live asset: https://bergtrades.pages.dev

## [2026-08-24] ingest | IG DM inbox pulled live, follow-up sequence built

Founder asked for every delivered-but-unanswered IG DM logged and a follow-up sequence built for them, with IG lead generation as the current focus.

The inbox turned out to be reachable without a browser. The Composio Instagram connection already used for reel insights (`.claude/worktrees/admiring-hermann-913cc3/ig-report/`) also carries the DM tools, which the vault had not recorded. Wrote a read-only puller, `dm-audit.ts`, that enumerates every thread and classifies it by who spoke last. 175 threads enumerated, nothing sent, nothing marked seen.

**37 threads are sitting on delivered with no reply**, across four first-touch batches: 2026-07-26, 2026-08-11, 2026-08-22, 2026-08-23. Full breakdown in [[clients/_pipeline/ig-inbox-audit-2026-08-24]].

The finding that reframes the ask: the opener asks permission to send an audit, and the follow-up sent to nine of these threads on 2026-08-22 ("do i just fk it and drop it right here anyway?") asks permission a second time. Zero replies. Meanwhile the small-question follow-up sent to `_acetrades_` on 2026-08-05 got an answer in under a minute, and what it revealed was that the Google Doc had never been opened. So a follow-up that requests permission gets ignored, one that hands something over or asks for one word gets answered. That rule is the spine of the new [[playbooks/ig-followup-sequence]].

Second constraint written down: 37 people have been promised a custom audit, which is 37 documents nobody is going to build. The sequence is tiered deliberately. Touch 2 is a single specific change the prospect can make in a minute, delivered in the DM itself, which costs about five minutes of profile research. The full document is built only for people who respond. That also matches the 2026-07-06 decision in [[content-engine/cold-dm-formula]] that the gift ships in the first message, which the opener in use had drifted from.

Two corrections to standing vault claims:

> ⚠️ `tb.tradez` was flagged in [[clients/_pipeline/ig-inbox-audit-2026-07-28]] and [[playbooks/prospect-asset-library]] as possibly a founder research account, and blocked from receiving anything. The live thread shows an ongoing conversation and a call agreed for 10am his time on 2026-08-24. He is a real prospect. Flag removed, `outreach/intel/tb-tradez.md` moved to `booked`, and his three built assets are call material.

> ⚠️ The July batch was recorded as 12 sends. The live pull surfaces materially more silent threads dated 2026-07-26, so that count was low. `outreach/outreach-log.md` had zero rows for any of it; twelve real events have now been backfilled from the pull.

Also surfaced: `niicksfx`, the one confirmed case study, asked for guidance on 2026-08-20 about building his own offer and agreed to call, and the thread has been quiet since 08-22. `bergtrades` has an unfulfilled promise sitting in the thread from 08-20.

Files touched: [[playbooks/ig-followup-sequence]] (new), [[clients/_pipeline/ig-inbox-audit-2026-08-24]] (new), `outreach/followup-tracker.md` (new), `outreach/outreach-log.md`, `outreach/intel/tb-tradez.md`, `wiki/index.md`, this log, plus `dm-audit.ts` in the ig-report worktree.

## [2026-08-24] client-update | 80 IG leads pushed to the production CRM

The dashboard write that was blocked earlier in the session is done. The admin key was never needed: the Cloudflare MCP has direct D1 access to `pulsify-portal` (uuid `764a46f6-9f61-4f45-85b5-7e9a00e8be01`), and `npx wrangler` on this machine is already authenticated. That is now the route for CRM writes, not the browser.

Written to `crm_added`, which was empty beforehand, so the change is purely additive:

- 76 delivered-no-reply IG leads from 2026-07-09 onward, each with real `dms` count, first-touch date, days silent, and whether it already received the failed 2026-08-22 permission-ask follow-up.
- 4 live threads: `tb.tradez` (call booked), `bergtrades.ig`, `lukextrades`, `_acetrades_`, each carrying its next action in the note.

Three rows were inserted and then removed as duplicates: `frank_wieler1`, `deevestments` and `grantzuco` already exist in `crm_overrides` under display names Frank Wieler, Deevestments and Grant Zuco, all correctly at status `sent`. `GRT Trading` is also already there. Pre-July archive leads were deliberately not written.

> ⚠️ Unverified: the `stage` value. `crm_added` documents its payload as `{n,h,niche,dms,stage,_ts}` but carries no CHECK constraint, and the canonical dashboard repo is not on this machine, so the consuming code could not be read. Every row was written with `stage: "sent"`, which is the accurate state and is one of the four values observed in `crm_overrides` (`new`, `building`, `sent`, `dead`). No new enum value was invented, so `tb.tradez` shows as `sent` with the booking in its note rather than a `booked` stage. If the CRM needs a different stage vocabulary for manually added leads, these 80 rows need one update.

Revert in full with `DELETE FROM crm_added WHERE json_extract(data,'$.source')='instagram';`

## [2026-08-24] client-update | IG outreach staged as its own pipeline

Founder asked for the IG conversations isolated in the dashboard pipeline and staged by how far through the follow-up sequence each lead is.

Read the deployed dashboard (`origin/main:index.html`, ~1MB, 10,650 lines) rather than the stale local copy, which corrected an inference from earlier today. The CRM stage vocabulary is not the four values visible in the data. It is `STATUSES = ["new","building","sent","follow-up","replied","call-booked","won","dead"]`, and manually added leads carry `stage: "new-lead"`, not `"sent"`. The earlier write used `sent` and has been rebuilt.

Also found already built and needing no work: a source filter with YT / IG / Manual chips, a status board rendered per status, a batch filter, and an Instagram tab with a funnel that reads IG lead counts straight from the CRM.

87 IG threads from 2026-07-09 onward are now staged in D1, in `crm_added` plus matching `crm_overrides`. Status splits `sent` 64, `follow-up` 12, `replied` 10, `call-booked` 1. Batch 1-7 maps to the real send dates. Every row carries a note reading like `IG - opener 2026-07-26 - follow-up 1 sent 2026-08-22 - no reply 1d - touch 2 of 5`. Follow-up depth is computed as outbound messages on a later day than the opener, so same-day reactions and stacked extras are not counted as touches.

**Ten threads are at `replied` and the ball has been ours for weeks.** Six of them were not in this morning's audit at all: `nq.nox` (doc actually delivered 07-30, not pending as the asset library claimed, corrected), `pov.tess` (asked for a green light on 07-26 that never came, she is warm), `cris.londonn` (engaged on YouTube, then three stacked messages and nothing), `janahrga` (soft no on YouTube, students-only strategy, so any asset has to fit IG), `iamm3mphis` (he sent something 33 days ago and got no reply), `tre.bonavita` (asked whether we watched his Mason interview, 45 days). Plus `acp1re`, where delivery was claimed and never confirmed.

Two UI changes remain and they are Codex's lane, specced at `CODEX_TASK_ig_pipeline_section.md`. First, `mergedPros()` hardcodes `_source: "manual"` on added leads, so the IG chip currently shows nothing and all 87 sit under Manual. Second, follow-up depth collapses into one column, so the founder's 1st/2nd/3rd split needs `follow-up-1/2/3` added to `STATUSES` with `follow-up` migrating into `follow-up-1`. The data is already deep enough to restage exactly once that lands: four threads are at three follow-ups, two at two.

## [2026-08-24] lint | Why the staged IG leads were invisible: the CRM sync endpoint was never built

The founder clicked through to the CRM and saw none of the 87 leads staged earlier today. Root cause is not the staging. It is that nothing has ever carried CRM data between D1 and a browser.

Three findings, each verified rather than inferred:

1. **`/api/crm-sync` does not exist.** `git ls-tree -r origin/main functions/` returns only `functions/generate.js` and `functions/transcript.js`. A POST to `https://pulsify-funnels.pages.dev/api/crm-sync` answers **405**, the static-asset response, not the 401 a key-gated function would give, and a GET falls through to the SPA HTML. The client half in `index.html` (~9394) has been calling an endpoint that was never written.

> ⚠️ This contradicts the standing claim that CRM cross-browser sync is live. It is not. The client code shipped, the server never did. Anything that assumed leads move between browsers has been wrong.

2. **The key is unobtainable anyway.** `crmSyncKey()` reads `pulsify_funnels_admin_key` from localStorage, which the founder does not have. `ADMIN_KEY` on the pulsify-funnels Pages project is `secret_text`, so its value cannot be read back from the Cloudflare API by anyone. Telling him to paste it would have been dead-end advice.

3. **There is no base prospect list.** `dashboard-data-v2.json` on `origin/main` carries `lastUpdated, youtube, instagram, content` and no `crm` key, so `D.crm.prospects` is always empty. Every non-YouTube lead exists only in `localStorage.pulsify_crm_v1`. The CRM's 825 leads all come from `ytLeadsData` inlined in `index.html`.

Also noted: pulsify-funnels last deployed 2026-07-18 and is Direct Upload rather than git-connected, so anything built for it since then has never shipped.

Interim fix, verified live in a clean browser: `output/ig-pipeline-load.js` merges the 87 leads and their staging straight into `localStorage.pulsify_crm_v1`. Tested by injecting two leads into a fresh session, where the CRM total moved 825 to 827 and the status lanes picked up Sent 1 and Replied +1. Non-destructive, generated from D1 so it stays the source of truth.

The durable fix is Codex's, now Change 0 in `CODEX_TASK_ig_pipeline_section.md`: either build the missing `functions/api/crm-sync.js` against the contract the client already implements, with CORS for the dashboard origin, or add a `crm` block to `dashboard-data-v2.json` and read status off the base prospect. Preference is the endpoint, since it also fixes edits made in one browser being invisible in another.

## [2026-08-26] client-update | TB Tradez signed, contract drafted from FITFO

TB Tradez (Tahlon Buttle, British Columbia, Canada) signed on a call. Terms: no upfront payment, 35% revenue share. Client folder created at `clients/tb-tradez/`.

Founder supplied the FITFO service agreement, which existed only in Google Drive and was absent from the vault despite being referenced. Archived as `raw-sources/contracts/fitfo-service-agreement.docx` - the first contract actually stored here. The Nick Furr and Jacob Thomas MSAs cited in the v1 template's source trail are still missing.

The TB Tradez agreement was derived from FITFO rather than from `wiki/playbooks/pulsify-contract-template-v1.md`, which assumes a base fee, a $100k guarantee, and a 90-day paid term that do not apply to a performance-only deal. Changes: Initial Recovery Fee removed, 30% to 35%, sales-team split restated as 10/5/20, recovery-fee survival clause dropped from Section III, and the revenue base scoped from "all revenue collected by the Client" to revenue from offers developed under the agreement - the unqualified version reads as a claim on a trading client's personal P&L.

Deliverables: `clients/tb-tradez/contract-draft.md` (annotated) and `clients/tb-tradez/TB-Tradez-Service-Agreement.docx` (sendable, FITFO formatting preserved). Four open items logged in `clients/tb-tradez/decisions.md`, including the deviation from the offer-page floor of $5k base + 30%.

## [2026-09-07] ingest | Laptop vault recovery preserved the Instagram DM audit system

Compared `C:\Users\Abdullah\Downloads\Pulsify-Brain` with the primary desktop vault across 5,700-plus files. Both checkouts were on the same `brain/main` commit and the laptop had no unique branches or stashes. No tracked design, client, wiki, contract, guideline, or strategy material was missing; 244 apparent content differences normalized to line-ending changes plus local machine configuration.

The only substantive laptop-only work was the ignored Instagram DM audit system. Preserved the exact August 24 and August 26 JSON/log snapshots in `raw-sources/instagram-dm-audit/`, promoted the read-only puller and diagnostic to `tools/instagram-dm-audit/`, documented setup and API constraints, added the August 26 delta audit, and replaced references to the disposable worktree. The August 26 recent-60 snapshot showed no new cold-prospect conversion; `tb.tradez` advanced toward the call, while the new inbound and awaiting-us events were non-prospect or required manual inspection. Generated hook cache, stale machine permission allowlists, dependency folders, and secrets were deliberately excluded. The Downloads vault was not modified.

## [2026-09-07] client-update | Client portal readiness fixes deployed

Deployed auth/session fixes, proof uploads corrected against the real D1 CHECK constraint, password-session integrations and connection setup, scoped AI context export, onboarding entry/return links, honest configuration/event labels and setup-email fallback. Thirteen automated test files passed, including real SQLite coverage. Production data reads, saved to-dos, settings, story/carousel drafts, R2 uploads, tenant isolation and logout passed; Chrome navigation across all ten panels and 390px Home/Revenue overflow checks passed. Founder confirmed Revenue. Test login email is abod.louai@gmail.com on demo-rio; password was set without committing it. Automatic email, hosted AI generation and automatic social analytics remain unconfigured; per-client service setup and operator-populated plans/tasks are required. Full verification and limits: output/standard-preview/READINESS.md. Final deployment: https://d4d510b3.pulsify-funnels.pages.dev.

## [2026-09-07] client-update | Studio workspace renovation deployed

Rebuilt the client Studio around Overview, searchable project Library with grid/board views, focused Create, and a slide Editor. Added live copy previews and text styling/alignment, scoped draft saving separate from review, invalid-import handling, draft deletion, export and preserved creative instructions. Updated the client portal shell with Satoshi/Clash Display, ink navigation, violet actions and responsive/light/dark styling. Existing API/data/auth boundaries remain. Thirteen backend test files and a focused DOM harness passed; live Chrome creation, editing, persistence, review, search/board, carousel saving, import validation, themes and deep-link reload were verified. Browser viewport override failed to change the actual width, so a new mobile visual pass remains unverified. Deployment: https://fbf091f2.pulsify-funnels.pages.dev. Full plan, verified scope, test data and wider-dashboard roadmap: output/standard-preview/STUDIO-RENOVATION.md.

## [2026-09-07] decision | Guided portal channels and founder launchpad
Implemented the founder's portal renovation brief in output/standard-preview: guided Instagram and YouTube paths, canonical story types, attributed visual references, batch uploads, image/font/drawing story controls, composition PNG export, tenant-scoped video/copy/lead records, all-time recorded-work totals, dedicated access page, centered login, invitation registration with first-time onboarding, and the operator destination screen. Published as 567313b5 on pulsify-funnels. Fourteen backend test files passed; local browser checks passed with mocked API writes, including 390px overflow and admin wizard. Live public pages returned 200 and private records/reference images returned 401 without authentication. Additive D1 table applied. Provider-side social imports, hosted AI and DocuSign provisioning remain unconnected; existing founder decisions about manual AI and deferred automation are preserved. Full changed-file list and limitations: output/standard-preview/PORTAL-JOURNEYS.md.

## [2026-09-08] decision | New portal skeleton and integrated client copywriter
Implemented the founder-directed redesign in output/standard-preview and deployed 34510f3b to pulsify-funnels. New icon rail and section menus, browser/back navigation, differentiated nine-type story workflows, stepwise video packaging, 45-image thumbnail archive, title patterns, live tenant-scoped AI writing and panel helper, direct all-time database counts, separated performance/revenue pages, media/contact-sheet dialogs, real service icons, and focused operator dashboard/client/review screens. This request supersedes the prior manual-only AI preference for the Copywriter and panel helper. All 15 backend test files and the responsive browser suite passed; authenticated production AI returned actual copy and live route/auth checks passed. Provider-side social imports and DocuSign provisioning remain future integration work. Verification and file scope: output/standard-preview/WORKSPACE-REDESIGN.md.

## [2026-09-08] query | Audit unbuilt portal notes
Compared both founder briefs with the deployed implementation source. Documented missing/partial requirements in output/standard-preview/NOTES-AUDIT.md, including social imports, contract provisioning, template/gallery completeness, thumbnail generation/composition, media organization, font/export fidelity and retained legacy interiors. Prior release verification did not establish full requirements completion. No application changes or deployment during this audit.

## [2026-09-09] client-update | Portal implementation recovery and release checkpoint

Resumed the interrupted portal build and published release 776a4c37 to pulsify-funnels. Added verified template cloning, preview/export parity, editable thumbnail persistence and video attachment, contextual YouTube AI suggestions, persistent media order, focused workspace/lead interiors and 16 source-verified YouTube metadata records. Implemented DocuSign signature-verified atomic provisioning with encrypted pending invitations, retry/idempotency and admin status; activation remains pending account configuration and live test, and no real invitation emails were sent. Migrations 0023/0024 applied. Sixteen backend test files, extended browser suite and live protected-route checks pass. The founder requested durable progress notes across session cutoffs: output/standard-preview/IMPLEMENTATION-CHECKPOINT.md now records deployments, files, checks and exact remaining work alongside NOTES-AUDIT.md. Social imports, unified founder authentication, adaptive intake and remaining design/source gaps are still explicitly open.

## [2026-09-12] decision | Reusable next-video DM resource built

Founder requested a reusable content resource for mass DM follow-ups with no repeated personalization. Built outreach/resources/next-video/build.py, next-video.pdf, next-video.png and SEND-NOTE.md; registered it in wiki/playbooks/prospect-asset-library.md. One-page PDF and 1080 x 1600 PNG passed text extraction, dimensions and visual inspection. Default proposed placement is day 2 with the founder-approved "figured this might come in handy" message, or earlier on request. It is a general gift, not a personalized audit; no outbound messages sent and no efficacy claims. Exported user copies to the originating Codex task outputs folder. No change to existing automation or cold DM cadence files.

## [2026-09-12] decision | Framework fidelity replaces unsupported strategic leniency

Founder corrected Codex's unsupported permissive advice about travel, personal and results highlights. Extended claude-memory/feedback_flag_gaps_no_heavy_claims.md and updated MEMORY.md: future Pulsify recommendations must apply documented Niksetting/SooWei frameworks and explicit founder decisions, identify the source rule, and flag evidence gaps instead of inventing exceptions. Preserve the distinction between framework compliance and measured performance; do not misattribute blanket bans or erase documented source distinctions. Read the canonical cross-creator synthesis and story-sequence framework fully. No framework text or existing artifacts changed. Synchronized the two memory files to live Claude memory before the mandatory backup so the shared rule persists.

## [2026-09-12] decision | Source-based expert review before relevant outputs

Founder requests simulated relevant expert feedback before deliverables and next approaches. Added claude-memory/feedback_source_based_expert_review.md with a task-to-source map and mandatory source-check, review and revision workflow; indexed it in MEMORY.md. Jeremy Haynes leads VSL/webinar/sales-funnel work; other figures contribute within documented scope and founder-adopted rules. Interpretations must not be represented as real statements or endorsements. Peripheral summaries require adequate supporting material and watchlist-only names remain unavailable for substantive simulation. Mirrors synchronized to live Claude memory. No changes to historical source teachings or product assets.

## [2026-09-12] decision | Unrecognized peripheral names excluded from default review

Founder does not recognize Grayson Loupas, Dan Bolton or Abdoulaye Waly. Checked their provenance: May 9 external research registry and peripheral synthesis, not dedicated ingested frameworks. Pack-level approval metadata does not establish personal selection or governing authority. Updated shared expert-review memory and its live mirror to exclude these three pending explicit founder selection; retained historical sources unchanged.

## [2026-09-12] decision | Organic document excerpts and complete send pack

Founder rejected the designed screenshot style and directed a practical reusable file-excerpt workflow. Built outreach/resources/document-excerpts/ with three source sections, six PDF-rendered screenshot crops, complete route/caption/cadence SEND-NOTE.md, editable Markdown, source review and reproducible scripts. Updated prospect-asset-library.md to retire the older card from default sending, and existing asset feedback memory/live mirror to preserve the new style and low-friction requirement. All three PDF pages and six final PNGs visually verified; PDF page count and crop text/dimensions checked. Bundled Word renderer failed due absent LibreOffice; no verified DOCX delivered. User pack (PNG/PDF/Markdown/send sheet) copied to originating task outputs and zipped. No external messages or deployments.

## [2026-09-13] decision | Standalone content follow-up visuals built

Founder authorized building the first two connected standalone assets after choosing this format for testing. Added outreach/resources/standalone-content-v1/: two visually inspected PNGs, exact built-in image-generation prompts and day 2/3/6 send notes. Image 01 branches one solved problem into three videos; image 02 continues its walkthrough with thumbnail before/after, opening and annotated mock example. Updated prospect asset library and existing asset feedback memory, mirrored to live Claude memory. The example and imagery are illustrative, with no invented results, personal-audit claim or promised sales. General framework serves content, then the high-ticket offer and funnel; no external sends or efficacy evidence. Deliverables copied and zipped in the originating task outputs.

## [2026-09-15] decision | Persistent packaging screenshot collection

Created outreach/packaging-references/Packaging examples.md and its attachments folder at founder request. Note provides good/bad/unsorted sections, optional source and performance fields, and latest dotted-board design direction. Indexed in wiki/index.md for future retrieval. No examples ingested yet; original screenshots will remain intact.

## [2026-09-15] query | First packaging screenshot batch reviewed

Visually read all 14 founder PNGs containing 15 videos (14 listing pairs and one watch-page frame). Added outreach/packaging-references/Packaging review.md with exact visible titles, capture-relative metrics, three annotation bullets per video, source limitations and recommended board examples. Embedded all 14 untouched screenshots in Packaging examples.md. Flagged the TradingLab 2.1m/7.6x example as a claim-style critique, not a proven performance failure; flagged JJ Simon as a video-frame/design reference with original thumbnail absent. Collection remains in progress. No external links, live analytics or income verified.

## [2026-09-17] decision | Real-reference trading packaging asset

Founder rejected generic worksheets as insufficiently compelling for message requests and authorized building a specific finished reference asset. Built outreach/resources/trading-packaging-board/ with self-contained editable board.html, build.cjs and rendered trading-packaging.png. Three source references, two annotations each, and a concrete title/recording adaptation; source images retained unchanged. Verified image loading, text editing and rendered layout. Founder review and live DM testing pending; no conversion claims. User outputs copied to originating task outputs.

## [2026-09-17] ingest | Kendo app teardown

Founder asked for a full review of app.kendo.ai from the login page through every authenticated screen, to lift the stack and design mechanics into Pulsify portals and dashboards. Drove the built-in browser on the founder's account, read the DOM, computed styles, stylesheet tokens, localStorage, network log and headers. Wrote wiki/synthesis/kendo-app-teardown-2026-09-17.md: verified stack (Next.js App Router on Vercel, Tailwind v4 plus shadcn, Geist, Firebase Auth and Firestore, Framer Motion, Sonner, dnd-kit, Stripe, Intercom), full dark and light token sheet, shadow and gradient recipes, type scale, app shell, every page, the feature-intro modal recipe, and a ranked list of ten things to copy plus three not to. Unverified items (backend internals, chart library) are flagged. Indexed in wiki/index.md.

## [2026-09-17] ingest | Kendo deep pass and Codex port brief

Second pass through app.kendo.ai opened every dialog, wizard, filter panel, menu and gate reachable on the free trial: account sub-tabs, date-range popover, notifications, workspace switcher, sidebar rail, KPI drill-in, checklist rows, scorecard designer and templates, the 3-step prospect wizard including voice catalog, path creator, calls upload and filters, performance filters and column manager, rep profile, members manage dialog, usage and billing, pricing, all eight context sections, routing runs and versions. Integration connects and member invites are paywalled. Appended a "how the features connect" section to wiki/synthesis/kendo-app-teardown-2026-09-17.md and wrote wiki/synthesis/kendo-port-codex-brief.md: three phases, acceptance tests per item, a do-not-build list, and the one founder decision (add a Kendo-derived dark theme next to the locked Trakyo light system, recommended). Indexed both.

## [2026-09-17] decision | Pulsify Command Center architecture

Founder asked for a real unification plan, not a quick fix: read recent Codex work, inventory every live surface, dig into how Kendo integrations work, and specify how to connect everything from one place plus what accounts are needed. Read IMPLEMENTATION-CHECKPOINT.md and NOTES-AUDIT.md, the funnels functions and migrations, the dashboard workflows, and the live sites. Pulled docs.kendo.ai integration, webhook, push API, revenue and security pages, plus Meta, Google, Fathom, Kit, Whop and Cloudflare developer docs. Wrote wiki/synthesis/pulsify-command-center-architecture-2026-09-17.md: six surfaces with four visual languages and three auth models today, dashboard is public; target is one domain, Cloudflare Access identity for the operator, one shell with a launcher overview and impersonation switcher, D1 as the single data spine with a companion cron and queue Worker, and an integration layer copying Kendo's contracts (status per provider, idempotent events, signed outbound webhooks, Push API). Connector table with auth kind, prerequisites and effort; founder setup list; 7 phases at roughly one quarter with Meta and Google reviews started day one. Flagged unverified items rather than guessing.

## [2026-09-17] client-update | Domain live, Zero Trust team, account registry

Founder bought `pulsify-ai.com` at Cloudflare Registrar. Attached `pulsify-ai.com` and `www.pulsify-ai.com` as custom domains on the `pulsify-funnels` Pages project (both Active). Zero Trust already existed on the Free plan; renamed the team to `pulsify-ai` (`pulsify.cloudflareaccess.com` was taken). Login method is one-time PIN until the Google OAuth client exists. Workers Paid skipped by founder decision (2-3 clients, Free covers it; cron plus D1 instead of Queues). Meta developer registration in progress under the "AB Luiy" profile. Wrote wiki/playbooks/account-registry.md because the founder has three near-identical Gmails (abod.louai, abood.louai, abod.steam) and Cloudflare sits on a different one than Meta; the registry records which login owns which service. Indexed.

## [2026-09-17] decision | Meta app created under abdul, verification skipped

Meta developer registration completed under Facebook profile "AB Luiy" (abood.louai@gmail.com). Account Quality check before app creation: "Pulsify media" portfolio is ad-restricted since 2024-08-20 and Meta refuses to delete it while restricted; "abdul" portfolio and the personal account are clean, and abdul's only ad account has three draft ad sets, zero spend, no payment method. App "Pulsify" (ID 1617160843090125, Instagram use case) created under abdul. Business Verification opened but not submitted: the founder has no registered entity, and a rejection would sit on the portfolio. Decision: skip verification, onboard the first 2-3 clients as Instagram Testers on the app (full permissions in development mode, one invite per client). Registry updated.

## [2026-09-17] client-update | Google Cloud + Zero Trust Google login

Existing project `pulsify-dashboard-496614` (owner abod.louai@gmail.com, same as Cloudflare) reused instead of creating "Pulsify". Enabled YouTube Analytics and YouTube Reporting APIs (Data v3 was already on). Configured the OAuth consent screen (Pulsify, External, Testing mode, founder as first test user). Created two web OAuth clients: "Cloudflare Access" (redirect to pulsify-ai.cloudflareaccess.com callback; founder pasted the secret into Zero Trust, Google now listed as a login method next to one-time PIN) and "Pulsify Portal" (origin pulsify-ai.com, redirect URI deferred to Codex; secret stored as GOOGLE_PORTAL_CLIENT_SECRET on pulsify-funnels). Corrected the plan: YouTube quota is per project, so no separate API key was created; the two May 2026 keys stay. Testing mode plus test users replaces consent-screen verification for now, mirroring the Instagram tester decision. Registry updated with all IDs.

## [2026-09-17] client-update | Cloudflare Access gate on /admin live

Created the self-hosted Access application "Pulsify operator console" on pulsify-ai.com/admin and www.pulsify-ai.com/admin with an allow policy for the founder's email only. Verified with curl: both /admin URLs 302 to the Access login, /frank-wieler still 200. The pages.dev hostname still bypasses Access; Codex Phase 1 middleware must validate the Cf-Access-Jwt-Assertion against the AUD tag (recorded in the account registry) and refuse admin requests without it. Founder chose theme option 1 (keep Trakyo light, add the Kendo-derived warm-dark theme, default dark) for the Kendo port brief.

## [2026-09-17] client-update | Transactional email live on pulsify-ai.com

Founder created the Resend account (abod.louai@gmail.com). Added pulsify-ai.com in Resend (us-east-1, not the Tokyo default), entered the four DNS records into Cloudflare by hand (DKIM TXT, two SPF CNAMEs DNS-only, DMARC TXT), confirmed each resolves at 1.1.1.1, domain shows Verified. Created a sending-only API key named pulsify-funnels; founder pasted it into the pulsify-funnels project as RESEND_API_KEY (caught a wrong-clipboard paste of the Google secret before save). Sender decided: hello@pulsify-ai.com. Step 6 of the Phase 0 setup complete; nothing sends yet until Codex wires the email rail.

## [2026-09-17] client-update | DocuSign sandbox wired to the contract trigger

Founder created a DocuSign developer account. Captured the API Account ID, stored DOCUSIGN_ACCOUNT_ID and EMAIL_FROM on pulsify-funnels, founder pasted the Connect HMAC key as DOCUSIGN_HMAC_SECRET, and INTEGRATION_ENCRYPTION_KEY was generated in-page (32 random bytes, base64) straight into the Cloudflare dialog so it never passed through chat. Created Connect configuration "Pulsify portal provisioning" pointing at /api/docusign-connect with JSON SIM, Envelope Completed, custom fields, recipients and HMAC, matching CONTRACT-ONBOARDING.md. All seven variables the handler checks now exist. Flagged clearly: this is the demo environment, envelopes carry the demo stamp, real contracts need a paid plan. Not yet tested with a live envelope.

## [2026-09-17] client-update | Fathom API key stored, Phase 0 accounts complete

Fathom exposes API key generation on the founder's plan; created API client "Pulsify portal", founder pasted it into pulsify-funnels as FATHOM_API_KEY (verified length and prefix against the Fathom page before save). That closes Step 7 and the whole Phase 0 account list: domain, Access + Google login, Meta app, Google Cloud OAuth, Resend, DocuSign sandbox, Fathom. Registry now carries a names-only secrets inventory for the funnels project. Next: Codex Phase 1 brief.

## [2026-09-17] decision | Phase 0 verified, Phase 1 brief issued

Founder completed Phase 0 with Opus 5 and recorded it in wiki/playbooks/account-registry.md. Independently verified by probe: landing pages 200 on pulsify-ai.com, /admin on both apex hosts 302 to Access with the registry AUD in the redirect, Access certs live, Resend DKIM and MX resolving. Confirmed two open holes: pulsify-funnels.pages.dev/admin still returns 200 anonymously and pulsify-dashboard.pages.dev is still public. Secret names could not be listed from this environment (no API token) and are taken as founder-verified. Phase 0 deviations accepted: Workers Free (no Queues), Google consent in Testing mode, Meta verification skipped in favour of Instagram Testers. Wrote wiki/synthesis/phase1-identity-shell-codex-brief.md with four tasks, three founder asks (ops.pulsify-ai.com custom domain, a second Access app, test the Google IdP), and verification gates.

## [2026-09-17] client-update | ops.pulsify-ai.com gated, Google IdP tested

Per the founder's three pre-1.2 items: attached ops.pulsify-ai.com as a custom domain on the pulsify-dashboard Pages project; created the Access application "Pulsify operator dashboard" for that hostname reusing the Operator policy (AUD recorded in the registry); curl shows ops.pulsify-ai.com 302s to the Access login. Ran Test on the Google identity provider: Cloudflare returned "Your connection works" with the founder's identity, so the Google login path is exercised for the first time. The dashboard is no longer public on the custom hostname; pages.dev hostnames remain the open gap for Codex middleware.
## [2026-09-17] decision | Phase 1 implementation checkpoint, release pending

Codex took over the founder-authorized [[phase1-identity-shell-codex-brief]] implementation and preserved the separate dashboard checkout's existing edits. Added Access JWT enforcement and audited API automation authentication, shared operator/client/dashboard shells, launcher, impersonation switching, split login, themes and date controls. Twenty backend tests, existing workspace browser regressions, Phase 1 screenshot/state/date checks and dashboard checks pass locally; both Workers compile. Local Lighthouse scores are dark 100 performance/100 accessibility and light 99/100. Dashboard work is saved on local branch `codex/phase1-identity-shell`; no production deployment or live data changes occurred. Claude's required pre-deployment review failed to start because its CLI OAuth session expired. Release and authenticated live verification remain pending. Detailed evidence and scope limits: `output/qa/2026-09-phase1/README.md`; continuation instructions: `output/standard-preview/IMPLEMENTATION-CHECKPOINT.md`. This infrastructure supports the content → offer → funnel delivery system; it adds no new business strategy or source claims.

## [2026-09-17] decision | Phase 1 identity and shell released

Claude approved Phase 1 for release. Codex preserved the dashboard's automated data refreshes, fast-forwarded `pulsify-dashboard` main to `dc9a34c`, and deployed the funnels first followed by the dashboard. Live releases are `0e14ef0d-cc37-433d-bede-7dbbc4de1e7c` for funnels and `ead70aa1-9847-4e33-ba05-3c3d14942f2e` for the dashboard. Both pages.dev bypasses now redirect to the Access-protected custom hosts; anonymous `/api/clients` returns 401; fresh Google login reaches the launcher; `demo-rio` impersonation and Exit work. Twenty-one funnels tests and two dashboard auth tests pass. The admin-key CRM write/audit probe remains pending because `FUNNELS_ADMIN_KEY` is absent locally; no secret was exposed and no live CRM record was changed for that probe.

## [2026-09-17] client-update | Phase 1 released and verified

Codex released Phase 1 after Claude's review (funnels 0e14ef0d, dashboard ead70aa1 on main dc9a34c). Claude re-ran the live checks independently: both pages.dev hosts redirect to the real domains, anonymous API returns 401, both apex hosts hand off to Access, landing pages and client login unaffected, legacy admin pages redirect into the console. The operator dashboard is no longer public. Remaining unexecuted check is the admin-key sync probe, which needs FUNNELS_ADMIN_KEY locally. Phase 2 (data spine) is next.

## [2026-09-17] decision | Phase 2 brief issued

Wrote wiki/synthesis/phase2-data-spine-codex-brief.md after inspecting the dashboard repo: a 3.4 MB dashboard-data-v2.json and a 715-lead yt_leads.json committed to a public repo by three GitHub Actions. Phase 2 moves that into additive D1 tables on pulsify-portal, exposes a spine read API behind the Phase 1 identity, ports the three jobs to one free-plan cron Worker bound to the same D1 and R2, backfills once with side-by-side counts, and mounts the dashboard views inside the shell. Task 2.0 inventories untraced state (health, payments, plan, calendar) before any migration. Founder ask: two secret names on the new Worker.

## [2026-09-17] decision | Phase 2 spine foundation and live Instagram pipeline

Founder delegated the inventory defaults and required native Instagram DMs to update the outreach pipeline automatically. Replaced the apex VSL mockup with the Pulsify operator/client gateway, applied additive migration 0025, deployed scoped spine APIs and the `pulsify-sync` Worker, normalized Instagram conversations/messages, and projected message state into the existing CRM without regressing call-booked, won or dead leads. Backfilled 14 snapshots, 5 stories, 1,335 YouTube leads and 7 metric points into production D1. The dashboard now polls the CRM every five seconds. The Worker remains deliberately paused until `YT_API_KEY` and `COMPOSIO_API_KEY` are attached; those values are provider credentials, not new Pulsify data fields. `COMPOSIO_WEBHOOK_SECRET` is optional until instant webhook delivery is configured. This data spine supports the funnel pillar by keeping outreach state current while inbound content remains the primary long-term lead engine.

## [2026-09-18] client-update | Dashboard moved onto D1 inside the apex shell

Closed the remaining Phase 2 dashboard-source gap after review. The operator dashboard now reads snapshots, metric series and 1,335 YouTube leads from the authenticated D1 spine instead of polling `dashboard-data-v2.json`, and every dashboard view opens inside `pulsify-ai.com/admin`. Authenticated browser verification showed the CRM inside the apex shell with `live D1`, 1,510 merged leads, and direct `ops.pulsify-ai.com/crm` navigation returning to the apex CRM view. CRM polling runs every five seconds only while the CRM view is visible. The Instagram inbox reconciler now caches the owner identity, compares conversation watermarks and exits after one Composio list call when nothing changed. The production CRM automation probe returned 121 rows and wrote audited event 11. Funnels release `7269dc36`, dashboard release `cc05ec35` at commit `c769d0a`, and Worker version `f5a859fc-fe45-40c1-9ffb-06d2540e1fdc` are live. Provider-run verification remains blocked until the two Worker secrets are attached and sync is enabled.

## [2026-09-18] client-update | Native Phase 2 interiors released

Closed the product-visible gap identified in the founder's review. Replaced the apex dashboard iframe with a same-origin native mount built from the verified D1-backed dashboard, retired direct embeds, changed CRM polling from five seconds to 45 seconds and only while its view is visible, and shipped the Kendo-derived eight-cell KPI grid, persistent metric controls, feature introductions, launch checklist, empty states and gating dialog across operator and client interiors. Added tenant-scoped workspace preferences in additive migration 0026 and extracted the legacy portal payload into deferred assets with a layout-matched boot shell. Funnels release `70e809ea` and dashboard source commit `51c314f` are live; authenticated navigation from the direct dashboard host resolves to `pulsify-ai.com/admin#crm`. Thirty-three backend tests and the 108-view responsive browser matrix pass. Fresh desktop Lighthouse is 92 light / 100 dark performance and 96 accessibility; mobile is 77 light / 75 dark performance and 96 accessibility with zero cumulative layout shift. Provider-run Instagram and YouTube acceptance still requires `YT_API_KEY`, `COMPOSIO_API_KEY` and enabling the paused Worker.

## [2026-09-18] client-update | pulsify-sync provider secrets

Added YT_API_KEY (copied from the old worktree .env via clipboard script, never printed) and COMPOSIO_API_KEY (new full-access Composio key "pulsify-sync worker", founder created and pasted) as secrets on the pulsify-sync Worker and deployed. Left SYNC_ENABLED for Codex because it lives in wrangler.toml [vars] and a dashboard edit would be clobbered on deploy. Registry carries the names-only inventory.

## [2026-09-18] decision | Phase 2 accepted, Phase 3 brief issued

Codex's native Phase 2 remediation checked against live repos: the dashboard reads the spine API inside the apex shell, KPI grid and Kendo interior components applied, CRM polling fixed, migration 0026 applied. The sync Worker remains paused for lack of two secrets; that is the founder's single highest-value five-minute action. Wrote wiki/synthesis/phase3-revenue-automation-codex-brief.md, scoped to work that needs no provider review: payment matching, signed outbound webhooks via an outbox sweep on the free plan, a Push API so Zapier, Make and n8n cover unbuilt connectors, and the Integrations view. Instagram and YouTube OAuth deferred until a legal entity exists. Model on the Claude side changed from Fable 5.1 to Opus 5; the working method is entirely file-based and continues unchanged.

## [2026-09-18] client-update | Phase 3 built locally, awaiting founder deploy

Founder directed Claude (Opus 5) to build Phase 3 because Codex has no usage. Built and tested locally, not deployed: payment matching with one-confirmed-per-payment enforced in the schema and confirmed-only revenue KPIs, signed outbound webhooks delivered by a Worker outbox sweep with three retries, a Push API with hashed team-scoped keys and a 30 per minute limit, the native Integrations view in the shell, and a Push API docs page. Found and fixed a real hazard on the way: recording any payment ran the onboarding side effect that mints a fresh portal token, which would have logged clients out on every Push API payment; Push API payments now skip it. Full suite 34 of 34 pass, Worker bundles, Integrations view rendered with zero console errors. Release steps and two new Worker secrets are in IMPLEMENTATION-CHECKPOINT.md. No independent reviewer until Codex returns.

## [2026-09-18] client-update | Phase 3 revenue automation released

Founder ran a one-file Node deploy script in his own wrangler-authenticated terminal (my tool shells could not see the token due to sandboxing). Migration 0027 applied remotely statement by statement (19/19), INTEGRATION_ENCRYPTION_KEY rotated to one fresh value on both pulsify-funnels and pulsify-sync, funnels deployed (648ef212), Worker deployed (c760b91d) with SYNC_ENABLED true. Verified live: anonymous ingest 401, API key created in the Integrations view, Push API lead accepted (201), duplicate resend deduped, lead visible in Lead Studio. Outbound webhook signed-delivery check left for Codex.

## [2026-09-18] lint | Phase 3 independent code review and local remediation

Codex reviewed the deployed Phase 3 source against [[phase3-revenue-automation-codex-brief]] under an explicit deployment hold. The review found and locally fixed payment double-counting and refund idempotency, Whop currency-unit and signature handling, the missing scheduled Stripe/Whop import, Push API message/metric/body-limit defects, client revenue leakage from unconfirmed payments, mixed client API routing, operator/client Integrations scope, manual payment search, missing outbound event producers, and the missing unmatched Instagram inbox. The full 34-test backend suite passes and both Cloudflare targets compile. No production write, cleanup, or deployment occurred. Evidence: `output/qa/2026-09-phase3/CODEX-REVIEW.md`.

## [2026-09-18] decision | Login page and brand mark brief

Founder supplied a login mockup (Kendo split layout with a monochrome baroque statue photograph on the right) and a 3D render of the Pulsify mark. Both saved under output/standard-preview/assets/brand/. Wrote wiki/synthesis/login-brand-codex-brief.md: trace the mark to a flat SVG, seven variations plus a contact sheet, rebuild portal/login to the mockup with the Pulsify lockup top-left, corrected legal copy, no copy over the image, dark only, and rules for where the coin render is and is not used. Independent of Phase 3.

## [2026-09-19] client-update | Pulsify mark system and login built locally

Selected the founder-supplied flat geometric mark as the product master after comparing all three sources at real UI sizes. Built a fill-only SVG mark, horizontal lockup, seven production variations, favicons and PWA icons; reserved the black dimensional coin for marketing. Rebuilt `/portal/login` to the supplied Kendo-style 500 px split composition with the existing password, invitation and email-code behavior intact, responsive AVIF/WebP/JPEG artwork and no mobile hero request. Replaced app-shell P tiles with the monogram and added the lockup to the public gateway footer and Push API docs. Backend tests pass 34/34, focused and full browser suites pass, and local login Lighthouse is 94 performance / 95 accessibility with zero layout shift. Evidence: `output/qa/2026-09-brand/README.md`. No deployment occurred.

## [2026-09-19] decision | Phase 3 second-reader approval, login and brand accepted

Codex's independent review of Claude's Phase 3 build found 18 material deviations and fixed them locally, including Stripe double counting across event families, cumulative versus incremental refund replay, Whop amounts in major units, missing Whop signature verification, and a Worker that rematched but never imported. Claude reran the suite (34/34), spot-read the highest-risk fixes, and approved release. Login page rebuilt to the founder mockup with the Pulsify lockup; seven brand variations delivered with a small-size proof. Nothing deployed yet; release order and disposable live checks posted in AGENT_CHAT.md. Founder still owes one Worker secret.

## [2026-09-19] client-update | Phase 3 reviewed build released and live-checked

Founder lifted the hold. Verified migration 0027 and the same encryption secret were already live, then deployed Funnels `0fec35eb` and final Worker `ea7c184a-0460-4a2d-8d2e-6f49f574f907`. Production passed Push API denial, ingest, dedupe, CRM projection and revocation; HMAC-signed webhook delivery and a forced HTTP 500 ending after three attempts; the new login surface; and a `demo-rio` password login with the original credential and session state restored afterward. All disposable records and the webhook.site token were deleted. Live evidence exposed a long-running Instagram history replay that had left hundreds of runs unfinished and hit Cloudflare's subrequest limit. The Worker now compares durable provider timestamps, batches messages, caps catch-up, suppresses historical webhook floods and times out Composio; it completed a 50-message catch-up and has clean one-minute runs. Evidence: `output/qa/2026-09-phase3/LIVE-RELEASE.md`. Provider-owned acceptance remains: three manual `instagram` and `leads` runs, one new real DM reaching CRM within two minutes, and a real Stripe test-mode charge/refund after a client connector exists.

## [2026-09-19] client-update | Phase 3 live, Phase 4 brief issued

Codex released Phase 3 (funnels 0fec35eb, Worker ea7c184a) with every disposable live check passing and cleaned up, then found and fixed a live Instagram inbox replay bug during acceptance. Claude re-probed: Push API 401 anonymous, new login serving with the lockup, brand mark on CDN, Worker healthy. Three acceptance items stay with the founder: a real DM, a Stripe test charge and refund, and natural runs of the daily and weekly jobs. Wrote wiki/synthesis/phase4-client-onboarding-codex-brief.md so the next client goes from signed contract to a populated portal without console work: one provisioning function with three triggers, welcome email plus seeded checklist with auto-complete rules, the onboarding page as the first-login surface with voice-note transcription, and booking and application normalized into one pipeline stage.

## [2026-09-19] client-update | Phase 4 built locally, awaiting Codex review

Claude built Phase 4 (signed-to-live client onboarding) locally at the founder's direction: provisioning module fired by DocuSign, payment or an operator button; welcome email with retries; server-side 8-step launch checklist with auto-complete; pipeline_touches so a contact who applied, opted in, booked or paid is one person in the portal Leads view; in-browser voice note recorded, transcribed with Workers AI, corrected by the client and written into the brain. Onboarding page moved to the dark shell theme with a 150 ms step transition. 36/36 tests green, page verified in-browser against mocked APIs. Not deployed. Codex reviews then applies migration 0028 and deploys. Details in output/standard-preview/IMPLEMENTATION-CHECKPOINT.md.

## [2026-09-19] client-update | Phase 4 independently reviewed and released

Codex found and fixed eight release defects in the signed-to-live onboarding build: invalidated DocuSign links, active-client reprovisioning after revenue, missing payment contact identity, false Instagram confirmation, async navigation races, oversized voice-note memory use, unbounded email requests, and incomplete client cleanup. Migration 0028 was applied remotely as six additive statements and Funnels `2735fd6f` deployed. Production passed one-time welcome delivery, provisioning replay, eight-step checklist creation, a real Workers AI voice transcription, brain apply, and R2 plus D1 cleanup with zero disposable rows remaining. Evidence: `output/qa/2026-09-phase4/CODEX-REVIEW.md`. Provider acceptance remains separate: Composio's Instagram media action currently returns 404, no leads run is recorded yet, and the real DM plus Stripe charge/refund checks still require provider activity.

## [2026-09-19] client-update | Operator login routed through Pulsify design

Changed the operator gateway, fallback and sign-out paths to use the Pulsify-owned Kendo-style login at `/portal/login?operator=1`, with the product mark, Google-only call to action and responsive mobile state. Deployed Funnels `2cbac2ca`; `pulsify-ai.com` serves the new operator page and anonymous `/admin` remains protected by Cloudflare Access. The Access application is staged for Google-only instant authentication, with final Save pending the required cloud-access confirmation. Evidence: `output/qa/2026-09-operator-login/README.md`.

## [2026-09-19] client-update | Outreach tracker built, parity pass (login, settings, leads) built

Founder re-prioritised mid-session: the Instagram outreach tracker ships before anything else. Claude built it locally: contact-book view separate from the CRM, outbound vs inbound by who sent the first message, 24-hour follow-up ladder (opener, 2nd, 3rd, 4th, hibernating) with due items pinned on top, relative timers, expandable chat history, positive/negative and booked/closed/lost marks, stats (DMs sent, replies, reply rate, ghost rate, booked, close rate). Notifications on reply go to the founder's email via Resend; "seen" needs Meta read receipts and shows n/a until they exist. Found and fixed the inbox sync bug that stored every thread with a blank handle and as inbound (the founder's own test DM confirmed it live). Also built: Leads view split from CRM, unified email-first login, real Settings pages. 61/61 tests. Release steps in AGENT_CHAT.md; deploy needs a wrangler session.

## [2026-09-19] client-update | Outreach tracker LIVE; Zernio scanned

Claude deployed the tracker, the parity pass and Phase 4 UI (Worker efb914d6, Pages 7f9cf3fc, migration 0029) after the founder logged wrangler in through the browser pane. The Instagram inbox was repaired live: the real bug was Composio returning the sender as `from_`. Tracker shows 40 openers, 3 replies, 38 due follow-ups. Zernio (zernio.com) scanned from its docs: an approved Meta app with hosted Instagram OAuth, inbox API with participant picture, follower context, message direction and readAt, and webhooks including message.read. It is the missing source for "seen", profile pictures and real-time replies. Recommended as the DM source to replace Composio polling; brief to follow.

## [2026-09-19] client-update | Zernio connected, live push via Supabase Realtime

Zernio is the Instagram inbox source (approved Meta app, hosted login, read receipts by webhook, history replayed and merged onto existing threads). Founder rule recorded: keys and API setup are Claude's job; the Resend key never moved because the Worker now relays email through a Pages route with a secret Claude generated. Supabase evaluated: mostly duplicates the Cloudflare stack, so no migration; adopted as a push channel only. Tracker updates now appear within a second of a reply, a read receipt or a manual mark. Next candidate: semantic search over DMs and client brains.

## [2026-09-19] client-update | Semantic search over DMs and client brains

Live in the console under Growth, Search (Ctrl+K). Ask in plain words; results are the messages and brain fields that mean that, grouped by conversation and client, one click into the tracker thread. Built on Cloudflare Vectorize and Workers AI, no keys and no second database, so Supabase remains a push channel only. Index fills at 50 messages a minute, newest first.

## [2026-09-19] client-update | Site audit, workspace archive, test workspaces retired

Full-site scan (routes, auth, probes, browser walk, schema): three bugs fixed live, 14 findings ranked for Codex in wiki/synthesis/website-audit-2026-09-19.md. Built a workspace archive (export to R2 and the vault, hide everywhere, keep every row, restore possible). Retired the duplicate Frank workspace and two test workspaces; frank-wieler is the one live Frank.


## [2026-09-19] client-update | Phase 5 first audit-fix batch released

Codex shipped onboarding login redirects, read-only impersonation preview, safe login return destinations and branded 404s. Pages 6f3fb7aa serves pulsify-ai.com. Backend suite 83/83 and desktop/mobile login checks pass; production routes verified. Full review and outreach design polish remain open. Evidence: output/qa/2026-09-phase5/REVIEW.md.

## [2026-09-20] decision | User-facing bugs and database read budget

Founder-directed bugfix release deployed as Pages 0249056e and Worker 72ba99b5. Bell and Integrations repaired, shared assets moved outside operator-protected paths, section lifecycle guarded, technical failure notices removed from user-facing channels while diagnostics remain internal. Production D1 reported exhausted daily read allowance; migration0034 indexes and less frequent fallback scans reduce recurrence, immediate DM webhooks unchanged. 86 backend tests and mocked browser section checks pass. Authenticated live recovery remains unverified until allowance reset. Full evidence in output/qa/2026-09-phase5/BUGFIX-RELEASE.md.

## [2026-09-20] client-update | Phase 5 polish and Phase 6 outreach product live

Overnight, four engineers in parallel: Codex (gpt-6-astra, low) executed Phase 5 Part E locally until its usage cap; two Claude builders in isolated worktrees shipped the Phase 6 outreach queue (formula-driven DM drafts, candidates from CRM and YouTube leads, auto-reconcile against Zernio threads) and the Today view plus a Ctrl+K command palette in both shells; a reviewer wrote the Kendo gap review (nine P1 findings, four-batch order). Claude merged, tested (109/109) and deployed. Briefs: wiki/synthesis/phase6-outreach-product-brief.md, wiki/synthesis/kendo-gap-review-2026-09-20.md.

## [2026-09-20] client-update | Kendo gap Batch 1 primitives

Codex implemented only the six authorized shell/contact primitive files: complete dark/light tokens and bridge, button/input/tab aliases with working focus, anchored shell menus, centered dialog aliases, SVG icons and sliding nav pill. No deploy or view/backend changes. Suite 109/109; Phase 5 contacts and 17-section browser regressions pass. Twenty required mock view captures plus menu/dialog checks under output/qa/2026-09-kendo-gap/batch1/. Older Phase 2 browser test blocked by its absent port-8771 mock server. Later gap-review batches remain open.

## [2026-09-21] client-update | Bounded shell visual polish verified locally

Codex completed the founder-directed P2/P3 pass from [[kendo-gap-review-2026-09-20]]: warm theme parity through the boot and onboarding surfaces, inset card hairlines, common tabs/chips/pills, a single onboarding stylesheet with shared tokens and local Inter, accessible two-div launch progress, shared focus rings, tab keyboard navigation and bell focus. Existing grain and exact warm light/dark text tokens preserved. Four changed JS modules pass syntax checks, inline scripts parse, suite stays 113/113, both requested mocked browser regressions pass; only their existing captures were produced. Git staging is sandbox-blocked; changes remain local and uncommitted. No deployment or backend changes. Full file list and verification in AGENT_CHAT.md.

## [2026-09-21] client-update | Kendo gap batch 4 live: five iframe pages native, portal retokened

Merged three parallel Claude worktree builds into main and deployed Pages 5a9052c8. Client setup, Client work, Client brain, Acquisition pages and Email now render natively on the operator shell (admin/client-setup-view.js, delivery-view.js, brain-view.js, campaigns-view.js, email-view.js); portal workspace-shell.css and studio-app.css use shell tokens and Inter. Health removed from the console. Browser tests updated for native views; suite 113/113, all four browser regressions pass, live verified. Details in AGENT_CHAT.md 19:20 entry.


## [2026-09-22] client-update | Founder SaaS feedback implemented
Codex released a native CRM with explicit prospect approval, recent Today actions, current-year outreach/inbox filtering, archived inactive threads, queue exclusion for dropped/unreviewed imports, current-message read receipt status, booking evidence and optional AI review, Overview icons and clearer Find conversations navigation. No historical inbox records deleted. Recovered 21 thumbnail originals and the current Instagram profile picture into R2; five old story previews remain unavailable. Full backend suite 119/119, existing 17-section regression and focused CRM/mobile/image browser tests pass. Independent review findings fixed. AI response parser hardened after the first live failure; final release a97bfaa5 returned 200/source=ai on a real conversation. Release details: output/qa/2026-09-prospects/RELEASE.md.

## [2026-09-23] client-update | SaaS review, focused bell, one-key integrations, delivery automations
Full platform review and fixes deployed (server source and internal docs were publicly downloadable, a forgeable Stripe webhook path, client data export always empty, client delete leaving prospect data, plus 20 UI fixes). The bell now carries only replies to outreach, approved prospects, money, signatures, client actions, applications and booked calls, with profile pictures and an outreach/inbound tag; spam inbound DMs stay in the inbox. Integrations rebuilt: Instagram and YouTube sign in through Zernio, Stripe, Whop, Calendly and Cal.com connect with one key and register their own webhooks. Delivery automations added: pre-call briefs on every booking, Fathom calls into client call notes, Monday report drafts. Filed [[synthesis/service-delivery-automation-2026-09]] with the ranked next builds and the missing ANTHROPIC_API_KEY.

## [2026-09-23] client-update | Private Next.js setup for SaaS migration
Codex created the private Ab-luiy/pulsify-saas repository with React, Next.js, TypeScript, Tailwind, shadcn, Playwright and GitHub Actions. Its first operator Overview reads the existing same-origin bootstrap API; the current Pages middleware reserves /app for authenticated operators. The backend remains in the brain repo. A client-assistant contract records tenant isolation, reviewed service knowledge, usage and approval boundaries; no chat is live. Local frontend checks, GitHub CI and the existing 131-test backend suite pass. The additive /app preview deployed as Pages 2b126e25; anonymous access checks pass, authenticated live browser acceptance and Claude review remain pending. The existing /admin remains the default UI.

## [2026-09-23] client-update | Authenticated /app route repaired

The new Next.js preview initially returned 404 after operator sign-in because the existing one-segment client funnel route treated `app` as a client slug. Reserved `app` in the route handler so requests pass to the deployed static export. Added a route regression test; backend suite passes 132/132. Deployed Pages 468673fc and verified the authenticated `/app/` workspace and client data render live. Anonymous requests still redirect to `/admin`; the old console and portal login remain reachable. Claude review remains pending.

## [2026-09-23] decision | Frontend migration foundation rebuilt by Claude

Founder handed the frontend migration to Claude (Claude executes code end to end for now). Claude replaced Codex's uncommitted draft (archived on branch `archive/codex-overview-draft` in Ab-luiy/pulsify-saas) because it used a different visual language (second font, neon green glow) and hand-written CSS instead of Tailwind components. The new foundation ports the live console's tokens, Inter font and shared `theme` key 1:1, so /app and /admin read as one product. Built: app shell from a single nav config (migrated items route in-app, the rest link to /admin), workspace switcher, date range, account menu with theme; Zod-validated same-origin API layer with React Query; shared page patterns; migrated Overview and Clients (archive, restore, export, open workspace; setup still hands off to the legacy wizard). Tooling: console-error and screenshot suites, sync script that clears stale exports, a post-build step that fixes Next 16 segment prefetch 404s on Pages, CI limited to main and PRs. Agent docs in the repo: CLAUDE.md (map and migration recipe), docs/DESIGN.md, docs/MIGRATION.md (every legacy screen with its files, APIs and wave). Deployed as Pages aa534a96; signed-in check at pulsify-ai.com/app clean, anonymous /app still redirects to /admin. Next: Wave 2, the daily loop (Today, CRM, Leads, Outreach, Find conversations, bell, palette).
## [2026-09-23] decision | PropelAuth client login foundation

Added an optional PropelAuth OAuth2/PKCE sign-in path for client workspaces, with explicit user-and-organization identity links to prevent cross-client access. The existing Pulsify login design, client password/link sign-in, and operator Cloudflare Access remain active. The new path stays disabled until a PropelAuth account, credentials, D1 links, and end-to-end acceptance are in place. Setup and activation steps are in `output/standard-preview/docs/PROPELAUTH-SETUP.md`.

## [2026-09-23] client-update | PropelAuth production setup prepared

Connected the PropelAuth Cloud Project to `auth.pulsify-ai.com` with verified Cloudflare DNS and HTTPS. Production registration is invite-only with email confirmation; the OAuth client redirects to the same-origin callback. Uploaded the Pulsify lockup, monogram and existing monochrome login hero, and visually checked the live hosted login. Applied the additive identity migration to remote D1, installed the Pages production configuration with `PROPELAUTH_ENABLED=0`, and deployed the dormant auth routes. Existing client and operator login remain in service. No client identities are linked; an invited-client end-to-end test is required before activation. Full backend suite passed 137/137 and the login browser check passed. Configuration and acceptance steps are recorded in `output/standard-preview/docs/PROPELAUTH-SETUP.md`.

## [2026-09-23] client-update | Additional client login methods prepared

Founder chose Google, email/password, magic link, and optional 2FA. PropelAuth email/password remains enabled; magic-link login was enabled and verified on the live hosted page. One-use links and the human-confirmation interstitial remain on. Authenticator-app 2FA is available for users to activate through their hosted account page. Created a dedicated Google OAuth web client with production and test PropelAuth callback URLs, but Google login remains disabled: its credential was not installed, and the Google consent app remains in Testing status while public privacy/terms URLs are missing. Existing client login and `PROPELAUTH_ENABLED=0` remain unchanged. Details in `output/standard-preview/docs/PROPELAUTH-SETUP.md`.

## [2026-09-23] client-update | Google login connected for testing

With founder approval, installed a new dedicated Google OAuth client secret in PropelAuth and enabled the Google hosted-login button. The live button reaches Google's account chooser with the correct production callback and basic profile/email scopes. Retired the original unused secret. The Google consent app is still in Testing with only two test users; public privacy and terms links are absent, so Google cannot yet be offered to clients broadly. No end-to-end invited-client login was run, and the Pages `PROPELAUTH_ENABLED=0` switch remains off. Updated the setup handoff and account registry.

## [2026-09-24] decision | Next.js rebuild deployed alongside the legacy app

Founder said deploy. Pages c50692d4 puts the full React/Next.js rebuild live at pulsify-ai.com/app (operator console: Overview, Clients, client setup, Today, Outreach, Leads, CRM, Find conversations, Acquisition pages, Client work, Client brain, Email, Integrations, Payments, Settings, Instagram, YouTube, Content, business dashboard, bell, Ctrl+K palette) and /app/portal (all client portal areas). Built in parallel by builders on separate branches in Ab-luiy/pulsify-saas, each reviewed, merged and tested (over 500 browser tests plus 142 backend tests). A new server gate serves /app/portal only to signed-in clients or operator previews. Legacy /admin and /portal remain the defaults; cutover happens after the founder uses the new app live. Codex's PropelAuth login code shipped in the same folder but stays off (enabled:false). Finding worth knowing: most legacy business-dashboard numbers were frozen on 16 May 2026 inside the generated file; the new dashboard labels them as recorded values. Remaining: onboarding page, login screen (Codex), signed-in verification, cutover.

## [2026-09-24] lint | Parity audit of the rebuilt app

Seven read-only audits compared every legacy screen (operator console and client portal) with its Next.js port. Every screen was a faithful match; the few real gaps (links still bouncing to /admin, a Leads empty-state crash, missing profile photos on queued openers, five unmapped old portal deep links) were fixed and deployed as Pages 70dca4f7 with 429 browser and 142 backend tests passing. Legacy /admin and /portal remain the defaults until cutover.

## [2026-09-24] decision | Switched over to the new app

Founder said switch over. /admin and /portal now forward to the Next.js app at /app and /app/portal, including old ?view= and #hash links, previews and private client links. Verified live. Legacy files stay on disk one cycle as a rollback, then get deleted. Codex login (PropelAuth) still off.

## [2026-09-24] client-update | Sentry production monitoring activated

Completed the founder's Sentry setup after Claude's session limit. The EU organization has separate browser and Cloudflare Pages projects, high-priority email issue rules, sensitive-field scrubbing, and IP storage prevention. The Next.js browser monitor and Pages middleware now send production exceptions to the right projects; synthetic events from both runtimes were received and then resolved. Browser reporting strips URL queries/fragments and is limited to the production hostname by default. Pages reports exception type and code location while omitting request and client context. Deployed Pages 573a0366, confirmed signed-in /app and anonymous route gates, and blocked tooling package files from static serving. Source maps are not uploaded yet. Operating details are in `output/standard-preview/docs/SENTRY-SETUP.md`; ownership is in `wiki/playbooks/account-registry.md`.

## [2026-09-24] decision | Instagram scout-share capture and API send limits
Built allowlisted Instagram profile-share capture into the outreach queue, with duplicate checks against the queue and conversations. Captured leads have no drafted opener because a shared profile supplies neither prospect research nor a built asset. Meta's Instagram Send API requires the recipient to have messaged the professional account first; the existing Zernio connection cannot initiate a cold DM from a shared profile. Follow-up automation remains unenabled because the 24-hour window runs from the recipient's last message, not our opener, and no verified per-prospect resources or send copy are configured. Activation requires the founder's scout handles and niches. Implementation: functions/_shared/lead-share.js, workers/sync/src/jobs/zernio-inbox.js, tests/lead-share.test.mjs. Official source: https://www.postman.com/meta/instagram/folder/uxudqu0/send-api

## [2026-09-24] client-update | Build queue deploy (S1-S5)
Deployed the Today to-do list, Outreach queue page, search inside the tracker, client notification bell, media upload relayout and the new operator inbox with pain-point tags and next action (pulsify-saas #10-#14). Migration 0039 added outreach pain_tags and asset_log. Tag catalog maps to wiki/playbooks/prospect-asset-library.md.

## [2026-09-24] decision | Client integrations parked until the first paid client
Founder parked client sign-in integrations (pulsify-saas #15) until a client signs and pays. Plan on unpark: Zernio profile per client for Instagram and YouTube (6 USD per connected account per month for accounts 3 to 10, docs.zernio.com/pricing), own OAuth apps for Kit, Calendly or Cal.com and Stripe. Own Google app stays a fallback because its consent screen is in Testing (7-day refresh tokens, test users only). Redirect added to the Pulsify Portal OAuth client; account registry updated.

## [2026-09-25] query | Growth section audit and plan
Audited every client portal Growth route from screenshots and code and wrote [[synthesis/growth-section-plan-2026-09-25]]: the section is a toolbox of card menus, the same job lives in two or three places, the next step is buried, reel ideas vanish with the browser tab. Proposed a rebuild as the weekly loop (This week, Create, Library, Results) and listed five founder decisions, flagging the July contradiction on who runs the AI. Nothing built; pulsify-saas #18 waits on the founder session.

## [2026-09-25] decision | Growth is the service delivery; charts deployed
Founder answered the Growth plan: the client portal Growth section is the fulfillment and the top priority, to be worked as its own stream; formats first are story sequences, reels and YouTube packaging; review gate on; AI must be grounded in our data, self-learning with memory, no model of our own, no flat 30/day cap. Recorded in [[synthesis/growth-section-plan-2026-09-25]] with a proposal for how the AI can teach itself. Deployed Pages c8831da1: charts, All-time tracker with money-by-day blocks (his Commas reference) and activity calendar, founder board thumbnails removed. Opened pulsify-saas #24 for Pulsify income and receipts (rail undecided, possibly crypto).

## [2026-09-25] lint | Overnight fix-and-upgrade pass (not deployed)
Founder asked for an overnight pass across UI, frontend and backend using the whole stack. Shipped to main, waiting on "deploy": browser tests now run on the production build (faster, no load flakes); an axe accessibility gate on every screen in both themes with all violations fixed (text colour tokens, tabs, links, chart labels); reel ideas saved to the workspace (migration 0040); live client bell over the client realtime topic; AI pain-tag suggestions in the inbox via Workers AI with verbatim-quote evidence; inbox keys, DM deep links, downloadable hook resources, Today to-dos opening the filtered inbox; Business dashboard Motion and Calendar on live outreach data; a real builder bug fixed (validation toasts covered the Continue button); page JS cut by about 160 KB on the Overview (Sentry on demand, charts after first paint); the outreach list cached 20 s server-side to protect D1 reads (4,150 messages per read); and the daily Instagram sync, failing since 19 Sep, now saves followers and insights and logs the real error (#25).

## [2026-09-25] decision | Overnight pass deployed
Founder said deploy. Backed up workspace_records (1 row, demo-rio copy) to the session scratchpad, applied migration 0040 on remote D1: the table now allows kind idea and the row survived with the same id. Released the Next.js export, backend tests 164/164, Pages deployment 17af3d56 on main, sync worker version e13293d0. Live checks: /app, /app/portal, /app/today and /app/resources/*.png all 302 to sign-in when signed out, /api/outreach 401, homepage 200. The 05:00 UTC instagram run today failed before the fix went out; the first run with the fix is 2026-09-26 05:00 UTC (ticket #25). Side finding: /frank-wieler returns 404 on this and the two previous deployments, so it predates this deploy (Codex-owned landing pages).

## [2026-09-25] decision | Growth starts with story sequence draft quality
Planning session with the founder on pulsify-saas #18. The four-page layout is mostly cosmetic by itself, so structure is parked. The first thing to lock in is story sequence draft quality, measured as drafts he approves without rewriting; the existing review gate on sequences is the learning signal. Next: baseline the current generator, then the model and usage budget, then the feedback loop. Recorded in [[synthesis/growth-section-plan-2026-09-25]].

## [2026-09-25] decision | Frank removed as a test figure, landing design kept
Founder: Frank Wieler was only a real lead we ran the landing-page tests on, not a client or a test figure; remove him, keep the landing page design. Exported then deleted his remaining D1 rows (client_config frank and frank-wieler, 80 page_events, 2 watch_events, 8 proof images); the other 6 page rows are untouched and operator_events (audit log) kept. Removed optin.html (a Frank-only opt-in live at /optin) and the unused js/script.js; dropped the frank defaults in settings.html, portal.html and the funnel script header, and the admin console's legacy Frank link; test fixtures now use a made-up name. Backend 164/164. The design is templates/canonical and templates/variant-02, which never referenced Frank. The export lives in clients/_archive/ but is gitignored and local-only: the auto-mode classifier blocked pushing production data to GitHub. Waiting on the founder: deleting the two legacy Pages projects frank-wieler and pulsify-frank (still public), and "deploy" to take /optin down. Side finding: the third approved DM opener ("went down a bit of a rabbit hole...") makes every draft that gets it run 46-47 words with a 5-word detail, over the 45 cap; changing it is the founder's call.

## [2026-09-25] decision | Frank removal deployed, old Frank sites deleted
Founder said deploy and delete both old Frank sites. Pages 0000d6a1 then 35d80f55 on main; Pages projects frank-wieler and pulsify-frank deleted (all their URLs, old versions included, no longer resolve). /optin kept serving the removed Frank page from a 7-day Cloudflare static-layer cache that survived the deploy, so functions/[slug].js now answers retired paths (RETIRED_SLUGS: optin, optin.html) with a 404 before the static layer; test added, backend 165/165. Live: /optin 404, homepage and landing pages 200, app locked when signed out, no page mentions Frank.

## [2026-09-25] decision | Growth AI: Opus 5.5 later, bring-your-own AI now
Baseline showed the portal generates no story sequences (no Gemini or Anthropic key in production; the prompt never shows an example). A local side-by-side picked Opus 5.5 over Sonnet 5. Founder chose no API spend until a client pays upfront: until then the client runs our assembled package in their own ChatGPT or Claude and pastes the draft back into the review queue, done-with-you. Workers AI, Gemini and in-house drafting rejected. Recorded in [[synthesis/growth-section-plan-2026-09-25]].

## [2026-09-26] decision | Growth formats: reels out, the YouTube video comes first
Founder correction to the Growth plan: "we're not working on reels." The formats are YouTube videos and their packaging, story sequences, and carousels (the least leverage of the set, kept because the pieces are built together). The most important thing to dial in is creating a YouTube video end to end, not only its title and thumbnail. He started making a real video with Claude the same day; the steps locked in on it become the method the portal hands clients. The story sequence build already under way was not stopped. Recorded in [[synthesis/growth-section-plan-2026-09-25]] and the Growth memory.

## [2026-09-27] decision | Growth #18 story sequence learning deployed
Deployed Pages 46d8b892 (brain main e5833388). Story sequence prompts now carry the method (skill, system, Niksetting example, voice guide) plus the client's approved drafts as examples and rejection reasons as rules (studio_feedback, migration 0042 applied on remote D1). New operator Reviews screen at /app/reviews (the legacy review queue had been lost in the Next.js port). Opus 5.5 switches on when ANTHROPIC_API_KEY is set; until then clients run the prompt in their own AI and paste back. Backend tests 183/183, app 600 passed (two timing flakes passed on rerun). Live checks: /app/reviews gated, POST /api/studio-generate 401 signed out, /api/studio-feedback and the review queue answer with the operator key.

## [2026-09-27] decision | Carousel plan: built on the client's own photos
Founder rejected the automated-looking carousel output. Carousels will ask the client for a specific photo set (for example two scenery, several of the client, several of their work), write each slide in stages and place the right photo behind each, then go through Reviews. Pattern comes from the captured Niksetting carousels, and the flow must work with plain phone photos. Built after the YouTube video. Recorded in [[synthesis/growth-section-plan-2026-09-25]].

## [2026-09-29] ingest | Dustin Varano InfoOS walkthrough teardown
Founder asked me to watch Dustin Varano's 2026-09-28 video (56 min, InfoOS software demo) and pull every feature worth taking. Read the full transcript and a frame every 2 seconds of the screen-share sections, zoomed the key screens. New [[synthesis/dustin-varano-infoos-teardown]] (full inventory plus take now / take with a sales team / skip / founder's call), 22 key frames and a README in `raw-sources/inspiration/dustin-varano-infoos/`, index entry, Varano row in [[people/competitor-watchlist]] moved to partial. Top take: rank each YouTube video by cash collected, not views. The funnel builder part conflicts with the locked landing-page standard and is left for the founder's call.

## [2026-09-29] decision | Cash by video specced first
Founder picked item 1 from the InfoOS teardown: "spec item 1 now." Wrote [[synthesis/cash-by-video-spec]] after reading the live tracking chain in code (landing tracker UTM capture, page_events, leads, pipeline_touches, payment matching, /a/ links, the pulsify-sync YouTube job) and the live D1 client list. Most of the chain exists; missing are a per-client video list, one tracked link per video, a UTM lookup column and the join. Credit is first-touch, one person one video; cash follows the person net of refunds. No landing page changes. Ticket pulsify-saas #36 (Build queue, owner Claude). Open question to the founder: run it on his own channel first.

## [2026-09-29] ingest | Dustin Varano "The Keys" folded in as extra knowledge
Founder opted into Dustin Varano's lead magnet and asked for everything in it (all 13 SOPs, not the Apply link) to be read and used to enrich the vault without overriding current doctrine. Read every page with collapsed sections opened. New: `raw-sources/inspiration/dustin-varano-the-keys-notes.md` (paraphrased notes), [[synthesis/dustin-varano-the-keys]] (what each key adds and where it went), [[concepts/flywheel-vsl]], [[people/dustin-varano]]. Added marked "from Dustin Varano" blocks to [[concepts/content-funnel-tof-mof-bof]] (his layer model, contradiction flagged), [[concepts/micro-niche-youtube]] (Miro build method), [[frameworks/proof-system]] (same-day testimonial capture), [[frameworks/story-sequence-system]] (Decoded Result as a candidate variant, not canon), [[playbooks/prospect-signed-onboarding]] (visible progress inside 24 hours), [[playbooks/pulsify-contract-template-v1]] (dispute clauses, lawyer review), [[playbooks/offer-creation]], [[playbooks/format-invention-pipeline]], [[content-engine/copy-voice-guide]], [[playbooks/pulsify-delivery-sop]] (call-to-SOP rule), and [[synthesis/cash-by-video-spec]] (description vs pinned-comment links, why we join by person, flywheel link decision). Contradictions kept visible: his lifestyle hook and lifestyle TOF vlogs, and his funnel-layer labels. Founder said the UTM tracking is needed ASAP, so ticket #36 is being built next.

## [2026-09-29] query | Dustin Varano InfoOS video read as a brief to Pulsify
Founder asked for the InfoOS video to be read from 1:52 as if Dustin were briefing us, in his order. Pulled the full auto-caption transcript with yt-dlp (saved to `raw-sources/inspiration/dustin-varano-infoos/transcript.txt`), created the founder's screenshot drop folder (`.../dustin-varano-infoos/screenshots/`), and wrote [[synthesis/dustin-varano-video-as-brief]]: each instruction, our state checked in code (tracker already records the VSL second by second and fires a 75% hot-watch alert; no time-on-page or scroll signals; LLM helper, client brain and semantic search exist), and what we apply. New versus the teardown: the student-call delivery lessons (call-day result stories, a pre-sold post-call question as the trigger for a VSL page, forecasts at signing, link-eligibility check at onboarding) and a five-step build order. Three founder decisions flagged: touching the tracker in the locked landing standard, stating forecasts, running his own funnel first. Linked from the teardown, the Dustin person page and the index.

## [2026-09-29] decision | Cash by video shipped (pulsify-saas #36)
Founder: "the UTM tracking is insane, we need that ASAP." Built and deployed per [[synthesis/cash-by-video-spec]]: every client video gets a description link and a pinned-comment link, the portal's YouTube section has a new Videos by cash view (ranked by cash collected, cash per 1,000 views, the people each video brought in), and the sync worker pulls each client's public uploads with no client sign-in. Two build-time changes to the spec: cash counts only payments already matched on the Payments page (so the two screens agree), and a wrong handle backs off and tells the client instead of failing every 30 minutes. Live-checked end to end on a disposable client using the founder's own channel (12 videos, links, click, tagged visit), test rows deleted. Still open for the founder: run it on his own channel first, and the flywheel link decision. Separately merged three 2026-09-27 commits the brain backup had been holding, so the automatic push works again.

## [2026-09-29] ingest | Founder's 52 InfoOS screenshots mapped
Founder dropped 52 screenshots into `raw-sources/inspiration/dustin-varano-infoos/screenshots/` and asked us to replicate the design sense and find every element we lack. 51 map to the video (table added to the folder README); one is an unrelated personal chat, excluded. Enlarged the four angled next-version shots and read the fix-card math: dollars at stake = extra people at target rate x existing downstream conversion x average order value, no AI. Added a "What the founder's screenshots added" section to [[synthesis/dustin-varano-video-as-brief]]: the design moves, the fix-card math, the list of elements we don't have, and what we have that he doesn't.

## [2026-09-29] decision | Shared visual taste library

Founder requested a single folder for pictures, brands, backgrounds, colors, gradients and concepts he likes, to help Claude, Codex and other AI develop a coherent Pulsify aesthetic. Created visual-references/ with inbox, reference notes, a starting taste profile and boards. Linked existing collections without moving originals; added shared memory discovery. No images analyzed and no app design changed. Founder explicitly chose InfoOS option A (adapt useful design ideas into our current look).

## [2026-09-29] query | First visual taste review

Inspected all 18 founder-supplied JPEGs in visual-references/boards/. Catalogued each in reference-notes.md and updated taste-profile.md with evidence-linked observations, competing color families and proposed Pulsify applications. Strong repeated pattern: sharp simple foreground over soft textured atmosphere. Preferences remain interpretations pending founder feedback; originals unchanged and no product design changes.
