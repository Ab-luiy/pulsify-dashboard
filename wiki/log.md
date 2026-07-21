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
