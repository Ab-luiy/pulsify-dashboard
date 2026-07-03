---
type: synthesis
tags: [outreach, sales, funnel, content, scaling]
sources: [[synthesis/sdr-pipeline-audit-2026-07-03]], [[synthesis/outreach-to-client-pipeline-roadmap]], [[synthesis/flagship-qa-2026-07-02]], [[synthesis/landing-page-standard]], [[content-engine/youtube-lead-sourcing-query-bank]], [[playbooks/lead-sourcing-outreach]], AGENT_CHAT.md log 2026-06-30 through 2026-07-03
created: 2026-07-03
updated: 2026-07-03
---

# Client acquisition renovation spec (Fable pass, 2026-07-03)

The master design and strategy brief for renovating the whole client acquisition system: the operator dashboard (CRM), the client portal, the lead sourcing layer (sources and queries), and the prompt system. Thinking only — Codex implements. This doc is the handoff. It builds on, and never duplicates, the SDR audit fixes already handed to Codex ([[synthesis/sdr-pipeline-audit-2026-07-03]], P0+P1) and the standing architecture decisions (two repos bridged by direct API; tokenized per-client portal auth; the seven quality gates in AGENT_CHAT.md).

## Why this matters for Pulsify

The acquisition system is the funnel pillar pointed at Pulsify itself, and it doubles as the productized deliverable clients pay for. Right now the pieces exist but the system is organized around data (tabs of leads, tabs of analytics) instead of around the motion (find, qualify, personalize, send, follow up, close, deliver). The renovation's single organizing idea: **rebuild both surfaces around the acquisition workflow, and make design serve that workflow instead of decorating it.**

## The one-sentence verdict per surface

- **Operator dashboard:** stop being a reporting tool, become an SDR cockpit — every screen answers "what do I send next and to whom."
- **Client portal:** stop being a data viewer, become the weekly proof that the $10K engagement is working — every screen answers "what did Pulsify move for me this week."
- **Lead layer:** stop relying on one channel (YouTube search) and start sourcing where selling is already proven, with a feedback loop that prunes queries by yield.
- **Prompts:** stop trusting the model and start making every claim cite its evidence line, with the vault's real approved/rejected copy as the example bank.

---

## Part 1 — one design system, two expressions (the reskin)

The dashboard has been reskinned twice in 24 hours (Pulse, then Track OS) and the user is asking again. That is a signal the problem is not the palette. The fix is a single, final design decision, then discipline.

### The decision to lock

**One Pulsify design system, shared across every surface a human touches, with two expressions:**

1. **Client-facing expression** (landing pages, client portal): the already-locked funnels skin — Inter, ink `#131720`, blue `#6871f4`, lavender, violet glow, glass pills. A prospect flows landing page → application → portal; visual continuity makes those read as one product. The portal should feel like the landing page grew a dashboard, not like a different company.
2. **Operator expression** (pulsify-dashboard): the same token family, tuned for density. Same ink, same single accent, tighter spacing scale, tabular numerals for every metric, hairline dividers instead of nested cards, higher information density per viewport.

Codex owns design (standing decision, 2026-06-30). This spec sets direction and constraints; the pixels are Codex's call within them.

### Constraints, non-negotiable

- **Kill the theme switcher.** Nine themes is a maintenance tax and the direct cause of the light-theme contrast rot (~133 hardcoded white overlays that never flip). Ship exactly light + dark, both first-class, driven by one token sheet. Park the old themes in git history, not in the bundle.
- **One accent color.** `#6871f4` is the brand. Signal colors (green/amber/red) exist only for state (hot lead, failure, overdue), never for decoration.
- **Type does the hierarchy.** Inter everywhere; weight and size ramp carries structure. No gradient text, no glassmorphism layered on glassmorphism.
- **Numbers are the product.** Tabular figures, right-aligned columns, consistent formats (K/M abbreviations past four digits, one decimal max). Every metric shows its freshness ("as of 2h ago") because the seven gates ban implying live data that isn't.
- **Motion only for state change.** 150–200ms ease-out on real transitions. No ambient animation, no synthetic metric motion (already removed once in the truth-state pass; keep it dead).
- **Empty states instruct.** Every zero-state names the action that fills it ("No contactable leads in this tier. Run enrichment or lower the tier filter."), consistent with the honest-empty-state rule already applied to payments.
- **Density toggle on the operator side** (comfortable/compact), one setting, persisted. Kills the "too big numbers / stretched charts" class of complaint permanently instead of re-litigating sizes per element.
- **Business terms are frozen.** "Cash collected" and the rest keep their exact names (standing user constraint).

### Why this is the last reskin

Every prior pass changed the skin but kept the structure. This one changes the structure (Parts 2 and 3) and treats the skin as tokens. After this, "make it look better" becomes a token edit, not a rebuild.

---

## Part 2 — operator dashboard renovation (the SDR cockpit)

### The structural problem

Today's tabs are organized by data source: YouTube leads, Instagram, CRM, income, payouts, health. The operator's actual day is a loop: find leads → qualify → build the personalized page → send → watch signals → follow up → close. The renovation reorganizes the whole surface around that loop.

### New information architecture

**1. Today (the default screen — the Action Engine, finally real).**
A prioritized work queue, not a stats wall:
- Follow-ups due now, from the Day 1/3/5/7 cadence in [[playbooks/lead-sourcing-outreach]] — each row: lead, last touch, next scripted step, one-click open of their thread/page.
- Hot signals from the funnels bridge: pages with fresh visits, watch % over threshold, new applications (source: `/api/campaigns`, already live on pulsify-funnels).
- Pipeline stalls: leads sitting in a stage past its SLA (e.g., "page built, never sent, 3 days").
- A small scoreboard strip on top (sends today/this week, replies, calls booked, cash collected) — the only place aggregate numbers appear on this screen.

**2. Pipeline (the CRM, restructured as stages).**
One board/table, stages matching the real motion:
`New → Qualified → Profile built → Page live → Sent → Engaged → Applied → Call booked → Signed → Client`
- Stage moves are automated where the system already knows: "Page live" flips when the Lead Studio bridge provisions a page; "Engaged"/"Applied" flip from campaign signals (watch %, application rows). Manual stages (Sent, Call booked, Signed) are one keystroke.
- Every lead card carries: tier (recomputed from real subs, per SDR P0), niche, contact channels found, page link if built, last/next touch, and signal freshness.
- This is where SDR audit P3 lands: lead state moves from localStorage into the durable D1 (portal-pipe `leads` table pattern), keyed by channel URL, localStorage demoted to cache. A scraped lead who later applies through a page becomes one row, not two CRMs.

**3. Lead Studio (kept as a core module, unchanged in concept).**
Same drawer, same asset generation, same profile flow — re-skinned to the new tokens and reachable from any pipeline row. The prompt upgrades in Part 5 land here.

**4. Sourcing (the intake room).**
Where scrape runs, query yield, and enrichment coverage live: which queries produced which leads (needs per-lead query provenance, Part 4), contact-coverage % per batch, exclusion-list hits, dead/renamed channels. This makes the top of funnel inspectable instead of a cron job you trust.

**5. Revenue (consolidated).**
Payments, payouts, cash flow, calculator — one section, unchanged in semantics, still gated by `payments.live === true`. It earns a top-level tab again when real payment data exists; until then it sits behind one nav item, not four.

**6. Channels (YouTube/IG analytics).**
The existing channel stats and IG report, demoted from prime navigation to a section — they inform content, they are not the acquisition loop.

### What gets deleted or parked

- The launchpad hero and latest-video hero as the landing view (Today replaces them; the video card moves into Channels).
- Any remaining demo/synthetic data surfaces (verified dead in the truth-state pass; keep them dead in the rebuild).
- The 9-theme switcher (Part 1).

### The bridge, made first-class

The dashboard reads pulsify-funnels' `/api/campaigns` and `/api/health` (admin key already stored once, localStorage) so engagement signals render inside the pipeline instead of on a separate site. This was decided 2026-07-02 (direct API, no shared D1) — the renovation just promotes it from "a button in a drawer" to the nervous system of the Pipeline and Today screens.

---

## Part 3 — client portal renovation

### The structural problem

The Client OS shell is competent but it is a data viewer: tabs of funnel rows, content items, call notes. A client paying $5–12K doesn't want to browse tables; they want to know the engagement is working, what happened this week, and what's next. The portal is also the sales asset shown to prospects mid-close, so it has to look like the $10K product.

### New shape (per client, token-gated as today)

**1. Scoreboard (default screen).**
- 3–5 KPIs against the contract's success metric (from `clients/{name}/progress.md` semantics): followers/subs, calls booked, close rate, cash collected. Each with trend and honest freshness stamp.
- A milestone tracker toward the contracted outcome (e.g., the $100K guarantee arc from [[playbooks/pulsify-contract-template-v1]]) — the single visual that justifies the retainer every time they log in.
- No number renders without a data source; anything unwired shows the instructive pending state, never a placeholder value (the standing anti-invention rule, applied to UI).

**2. This week.**
The weekly heartbeat, powered by the same data the operator's Delivery editor already writes (`content_items`, `call_notes`, `client_assets`): what Pulsify shipped, what's in production, what we need from the client (the dated client-side asks pattern from [[raw-sources/prompts/weekly-client-report-prompt]] moves in-product). This tab is why they stop asking "what's happening" on calls.

**3. Funnel (already live, keep).**
Visits, watch %, applications, Kit status — re-skinned, plus per-lead drill-in.

**4. Content (already live, upgrade).**
From a list to a pipeline view (scripted → shooting → editing → scheduled → published), each item carrying its packaging (title/thumbnail) so the client sees the machine, not a to-do list.

**5. Calls (already live, keep) and Assets (already live, keep).**
Call notes gain the 3-bullet summary convention at the top. Assets gain categories (scripts, hooks, swipe files) matching Lead Studio's asset types.

**6. Decisions.**
A rendered view of `decisions.md`: what was decided, when, why. Cheap to build, disproportionately trust-building — no client ever remembers what was agreed; this ends that.

**Pipeline (deals/revenue) stays honestly pending** until the operator-dashboard revenue bridge exists (unchanged from the roadmap; do not fake it).

### Portal as sales asset

Add an operator-triggered "demo mode" flag that renders the portal shell with clearly-labeled SAMPLE data (watermarked on every widget) for use on sales calls. Labeled sample data on a demo flag is honest; unlabeled fake data is banned. This turns the portal into the closing slide of every pitch without violating gate 2.

---

## Part 4 — leads: sources and queries beyond the P1 handoff

P1 (already Codex's: immersed-pain query rewrite, long-form durations, FOREIGN_HINT fix, exclusion list) fixes the current channel. This part is the next layer: more channels, and a loop that learns.

### 4.1 Query provenance and the yield loop

The scraper doesn't record which query surfaced a lead. Add `query` and `scraped_at` to the lead schema at scrape time. Then the Sourcing screen (Part 2) can show per-query yield: leads found → % tier A after enrichment → % with a contact channel → (later) replies. Every scrape run ends with a pruning decision: queries below floor get cut, and the query bank page ([[content-engine/youtube-lead-sourcing-query-bank]]) gets updated from data instead of theory. The bank's own open question ("no data yet on which niche returns the highest signal") has been open since May because the data was never captured — this closes it structurally.

### 4.2 Offer-native directories (the highest-leverage new source)

YouTube search finds people who make content and might sell. Sales platforms list people who already sell — the entire ICP filter ("does the craft, has an offer, sells access") is pre-applied by the platform's existence:

- **Whop marketplace** — public category pages (trading, ecom, reselling). Every listing is a creator with a live paid community, price visible, member counts often visible. Cross-reference each listing back to the creator's YouTube/IG for the content-side read.
- **Skool discovery** — public, browsable by category, shows member counts and pricing. Same cross-reference play.
- **Stan Store / Fanbasis / Beacons link pages** encountered during enrichment — presence of a paid product on the link page is an offer-intent signal worth explicit points in scoring, not just a URL string in a note.

Build these as new scraper modules feeding the same lead schema (source field: `whop|skool|yt|ig`), same dedupe by canonical channel URL where one exists. Honest unknowns to verify before building: both marketplaces' anti-bot posture and ToS for scraping; if automated pulls are blocked, a manual weekly pull with a paste-in importer still beats not having the source. No claims here about their coverage or lead quality — that's what a two-week trial run measures.

### 4.3 Seed-channel expansion

Known-good leads and signed clients are seeds. From each seed channel: featured channels, channels they link in descriptions, and guests/interviews (a coach interviewing their own student, like Frank's, is the single richest artifact we've seen — it carries proof AND voice). YouTube removed the related-videos API parameter, so this is channel-page and description parsing, not one API call — scope it accordingly.

### 4.4 Contact enrichment is the binding constraint

489 leads, 14 IG handles, 0 emails (audit F2). Better queries multiply a number that gets multiplied by ~3% contactability — fix the multiplier first. P2 of the SDR audit already scopes this (parse all channel links, expand Linktree/Beacons, scrape lead sites for email, verify IG handles resolve); this spec adds priority: **P2 contact discovery outranks any new source module.** A directory source helps here too — Whop/Skool listings usually carry a Discord or direct contact path that YouTube descriptions hide.

### 4.5 Proof-content targeting (founder direction, 2026-07-03)

The founder's read, and it's right: beyond pain queries, the highest-signal creators are the ones **already publishing their results, unique mechanism, and case studies** — a "how I made $X with Y" library is simultaneously proof they do the craft, proof they have an audience, and proof they think in offers. Two cheap layers:

1. **A proof-content query tier per niche**, alongside the pain tier: result-reveal and mechanism-reveal language (`how i made 10k a month trading`, `i turned $1k into`, `my exact strategy that made`, `[niche] case study`, `how i flipped my account`, `the product that did $X in 30 days`). These directly surface the creators the founder described instead of inferring them from pain-answer content.
2. **Proof-density enrichment via channel RSS** — YouTube's per-channel RSS feed returns the last ~15 uploads with zero API quota. Count result-reveal/case-study/mechanism patterns across those titles per lead; store as `proof_density`; feed scoring as a strong positive. A channel whose recent library is one-third result-reveals is the ICP regardless of which query found them. The same RSS scan doubles as the liveness check below for free.

### 4.6 Liveness and velocity

Prefer channels with an upload in the last 30 days and a rising short-window view trend ("small but growing" beats "small and stalled"). Computable from the same RSS scan as 4.5 (upload dates) plus data already returned at scrape time; feeds scoring as a modifier, not a gate.

---

## Part 5 — prompt enhancements

The prompt system's weakness is not phrasing, it's verifiability. Every upgrade below makes output checkable.

### 5.1 Evidence-cited generation (the big one)

Every generated field that makes a claim (headline, subhead, proof line, profile section) must carry an `evidence` companion: the verbatim brief/transcript line it derives from. No evidence line → field renders blank/generic-default. This turns the anti-invention rule from an instruction the model may ignore into a contract the code can enforce (the provisioning flow can literally reject uncited tokens). Apply to: the `/settings` provisioning prompt, Lead Studio's `buildPrompt()` asset generation, and the creator-profile builder (`buildAnalyzePrompt()`), all in pulsify-dashboard's index.html and pulsify-funnels' `_shared/provision-prompt.js`.

### 5.2 A real example bank, from the vault's own history

The prompts currently state rules; models follow examples better than rules. The vault already owns a graded set:
- **Approved:** Frank's final hero ("The youngest student in Frank's mentorship just hit his first $1 million." + subhead) — case-study-led, sourced.
- **Rejected, with reasons:** "Build a Subscription Brand that pays you every month" (generic outcome), the trust-strip ("Subscription-first model / Real proof, not promises / …" — rule-of-three padding), "…an asset, not another daily reset" (negative-parallelism tell).
Embed 2–3 approved/rejected pairs per asset type directly into the prompts as few-shot contrast. Source them from the AGENT_CHAT log and [[synthesis/landing-page-standard]]'s headline rule; grow the bank every time the user approves or kills copy.

### 5.3 Extraction prompt: close the two parked gaps

Lead Studio was parked pending "offer architecture" and "lead magnets" as structured inputs. Stop waiting for a separate input: extend the creator-profile extraction schema with two sections the transcripts can already partially answer — **Offer architecture** (price points, delivery format, upsell path, quoted or absent) and **Lead-magnet surface** (free assets they push: Discord, PDF, webinar). Where transcripts are silent the sections stay explicitly empty, which itself tells the operator what to ask Perplexity for next. Also add a **Objection forecast** section: given the profile, the three most likely reasons this creator ignores a cold page — feeds the opener and email-sequence prompts directly.

### 5.4 Self-check pass, machine-checkable

Append to every asset prompt a final-step checklist the model must output as pass/fail before the asset: the 9-point voice guard ([[raw-sources/prompts/_voice-guard]]) plus asset-specific checks (headline: mechanism/case-study-led? one idea? no invented numbers?). A failed self-check regenerates once. Cheap tokens, catches the highest-frequency tells at the source instead of at human review.

### 5.5 Model routing, stated once

Bulk/low-stakes (profile extraction, drafts): Gemini free tier as configured. Prospect-facing final copy: strongest available model, then the self-check pass regardless of model. Never route final outbound copy to the cheapest tier just because the key is free — the seven gates make quality model-independent in discipline, not in ceiling.

---

## Part 6 — build sequence for Codex

Waves are separable; each is shippable alone. Codex weekly quota was 61% at the last reading — sequence accordingly, and cross-review per protocol only on deploy-critical waves.

> **Re-sequenced 2026-07-03 (founder):** the client portal is the founder's top priority — "fully built and vetted out." Wave 3 (portal) runs FIRST, still mock-gated (one Scoreboard mock posted for sign-off before the full build). Waves 1 and 2 follow. The proof-content targeting layer (4.5) is pulled forward to ride with the first sourcing work after the portal ships.

**Wave 0 (SHIPPED 2026-07-03):** SDR P0+P1 from [[synthesis/sdr-pipeline-audit-2026-07-03]], plus P2 contact enrichment (336/489 contactable, recalibrated tiers A 55 / B 117 / C 355). Everything below assumes real subs, honest tiers, single JSON source of truth, authed functions, ICP-true queries — all live at `pulsify-dashboard` commit `58d22ab`.

**Wave 1 — data spine.** SDR P3 (durable D1 lead state, identity by channel URL) + P2 contact discovery + query provenance fields (4.1). Acceptance: a lead survives a cleared browser; one row spans scrape→application; every new lead records its source query; contact coverage measured per batch and visible.

**Wave 2 — operator dashboard renovation.** Part 1 tokens + Part 2 IA (Today, Pipeline, Sourcing, consolidated Revenue, Channels). Acceptance: default screen is the Today queue with real follow-up items; pipeline stages auto-advance from bridge signals; light+dark both pass contrast on every screen; theme switcher gone; no synthetic data anywhere.

**Wave 3 — client portal renovation.** Part 3 (Scoreboard, This week, Decisions, demo mode; upgraded Content view). Acceptance: a real client link shows only real or honestly-pending data; demo mode is watermarked on every widget; the portal and the landing page read as one product.

**Wave 4 — sources and prompts.** Part 4.2/4.3/4.5 source modules + Part 5 prompt upgrades. Acceptance: one two-week trial batch from a directory source lands in the same pipeline with source provenance; provisioning rejects uncited tokens; self-check pass/fail visible in Lead Studio output.

Design mocks precede code for Waves 2–3: one screen each (Today + Scoreboard) posted for user sign-off before the full build, so this genuinely is the last reskin.

## What needs the user (unchanged blockers, restated once)

Wistia/Typeform/Kit accounts; the neutral production domain decision; the ADMIN_KEY click-test of authed UIs; sign-off on the Wave 2/3 mock screens; a decision on paid email-finder spend only if Wave 1's free contact pass leaves coverage low.

## Open questions / gaps

- Whop/Skool scrape feasibility (anti-bot, ToS) — verify before committing Wave 4 build time; manual-pull importer is the fallback.
- Revenue bridge for the portal's Pipeline tab (operator dashboard ↔ funnels D1) — still undecided, deliberately excluded here; decide after Wave 1 proves the direct-API pattern under load.
- Follow-up cadence automation depth: queue-only (operator sends manually) vs. semi-automated sends — queue-only assumed here; anything more is a new decision.
- Whether the static IG prospect list is live or legacy (inherited from the SDR audit, still open).

## Connections

- [[synthesis/sdr-pipeline-audit-2026-07-03]] — the data-honesty floor this builds on
- [[synthesis/outreach-to-client-pipeline-roadmap]] — the A-to-Z this renovates the surfaces of
- [[synthesis/landing-page-standard]] — the client-facing token source and copy rules
- [[content-engine/youtube-lead-sourcing-query-bank]] — gets its yield loop from Part 4.1
- [[playbooks/lead-sourcing-outreach]] — the cadence the Today queue operationalizes
- [[synthesis/flagship-qa-2026-07-02]] — the standing rules every wave inherits

## Source trail

Grounded in: AGENT_CHAT.md log entries 2026-06-30 → 2026-07-03 (reskin history, bridge decision, quality gates, quota reading), [[synthesis/sdr-pipeline-audit-2026-07-03]] (489/14/0 contact data, tier corruption, P0-P4), [[synthesis/outreach-to-client-pipeline-roadmap]] (phase status), [[content-engine/youtube-lead-sourcing-query-bank]] (query doctrine), and shared memory (`project_dashboard_product_vision`, `feedback_dashboard_quality_bar`, `project_yt_lead_criteria`, `feedback_lead_queries_common_terms`, `project_lead_studio`). Directory-source claims (Whop/Skool public browsability) are from general knowledge and flagged for verification before build — no coverage or quality numbers asserted.
