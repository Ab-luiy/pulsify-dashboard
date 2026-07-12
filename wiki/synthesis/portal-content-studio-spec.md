---
type: synthesis
tags: [funnel, content, instagram, scaling, offer]
sources: [[wiki/synthesis/client-portal-product-spec]], [[wiki/frameworks/story-sequence-system]], [[wiki/synthesis/cross-creator-synthesis]], [[wiki/synthesis/niksetting-extractions/11-content-system-five-pillars]], [[wiki/synthesis/soowei-goh-extractions/03-408k-personal-brand-with-ai]]
created: 2026-07-12
updated: 2026-07-12
---

# The client dashboard — full spec (founder-directed 2026-07-12)

Founder direction, verbatim intent: this is NOT the heavily coded funnels stack — it is a dashboard for clients, with a login and password, where a client checks their revenue, their content, the performance, the metrics, the team, how things are moving, their plans, and their to-do lists — and where the Instagram section is exactly where they generate their story sequences, carousels, and YouTube content. Grounded in both creator corpora and in everything Pulsify has already built. Build lane: Codex implements, Claude specs and reviews; fire gated on founder's morning go.

## What already exists (nothing pre-built gets dropped)

- **Client portal, live** on pulsify-funnels: token-link portals minted per client at onboarding ([[playbooks/prospect-signed-onboarding]]), delivery data seeded, portal tabs with I1 backends.
- **Integrations hub I1, live:** D1 integrations + payments tables, Stripe/Whop/Kit/Cal.com webhooks, Discord alerts, Mark-paid onboarding trigger — this is the REVENUE section's data source, already flowing.
- **Portal v2 spec** ([[synthesis/client-portal-product-spec]]): connection-first design (client connects Kit/YouTube/IG/booking/payments from inside the portal), real-data-or-instructive-empty scoreboard. That spec remains the architecture; this spec extends its section map and adds the content studio.
- **Atelier client design** (client.html): finished skin, never integrated — candidate visual base.
- **Operator dashboard** (pulsify-dashboard): CRM, health, quota tooling — stays operator-side; the client dashboard is its client-facing sibling per [[project/dashboard product vision]] (the productized $10K prescriptive system).
- **View-tracking pipe** on funnels (per-prospect watch drill-down, /a/ token links): the attribution rail SooWei's model requires (ratified dial 7).
- **The two chat skills** (`sequence-ingest`, `story-sequence-generator`): the generator skill IS the studio's engine; the portal UI wraps the same contract so chat and portal never diverge.

## Access model

- Today: unguessable token links. Add: **credentialed login** — email + password per client (plus operator master access). Simplest safe path on Cloudflare: hashed passwords in D1, session cookie, rate-limited login, password set via emailed magic link at onboarding. No third-party auth dependency for v1.

## Section map (the founder's list, made concrete)

1. **Revenue** — cash collected (Stripe/Whop webhooks, already landing in D1), payment history, month-vs-month, the $100K-guarantee tracker where applicable. Client-visible mirror of what the weekly-report prompt already computes.
2. **Content** — the calendar and pipeline: what's scheduled, in production, published (per-client `content-pipeline.md` made visual); cadence compliance vs the plan (sequences: 3/week floor, 5-7 target; reels; YouTube weekly).
3. **Performance & metrics** — the measurement doctrine from both corpora (full inventory below). Week-over-week only, never month-vs-month (SooWei). Prescriptive, not just descriptive: every red metric links to the fix (the Action Engine principle from the dashboard product vision).
4. **Team** — who is on the client's engagement (Pulsify side + their own hires as they scale: setter, editor), roles, response channels. Mirrors Niksetting's team-exposure doctrine (clients who know the team trust the delivery).
5. **Momentum ("how things are moving")** — the weekly recap block: shipped last week, shipping this week, deltas on the 3-5 headline numbers; monthly recap ritual notes (Niksetting's one-hour dashboard review, productized).
6. **Plans** — the roadmap: their game plan from onboarding (the intake -> roadmap flow both creators run), phase they're in, next milestone.
7. **To-dos** — action items with owners and deadlines (client-side and Pulsify-side visible separately), fed from calls per the client-work conventions; checkable.
8. **Content studio** — the reason the dashboard exists, per the founder:
   - **Instagram / sequences:** type picker (the canonical seven: value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA — plus start-here and launch assets) OR free-text intent ("I want to talk about a case study and how it relates to viewers"); goal selector (reach / DMs / booked calls -> CTA placement); proof inventory pull (from their uploaded receipts); per-slide photo checklist with concrete recommendations and upload slots; generated pill-by-pill copy with emphasis notes; operator review gate before "ready to post" (default on).
   - **Instagram / carousels:** same flow once the carousel framework page exists (captures accumulating at `wiki/content-engine/carousel-breakdowns/`).
   - **YouTube:** title+thumbnail generation (existing titles-thumbnails contract), publish calendar, per-video "who converted" notes (buyer-mirror answers).
   - **Automations:** trigger-word inventory (per asset), ManyChat/DM routing map (word -> automation -> setter), status lights.

## The metrics inventory (the Niksetting/SooWei cross-check the founder asked for)

Sequence-level (Niksetting — the tracking he says nobody does, his moat, our product):
- **Drop-off rate** — THE story metric: first-slide vs last-slide views; leave at slide 2 = hook failed, slide 7 = body failed; improve 1% at a time.
- **Completion %** (his launch benchmark: 71.9% over ~9 slides), **per-slide views**, **DMs + interactions per sequence**, **profile visits from stories**, **compared performance vs prior sequences**, and a **copy log** so winning copy is reusable ("the system capitalizes on all the copy").
- Cadence compliance: sequences/week vs the 3-floor/5-7-target; type mix across the seven (his self-audit: "how many of the five types would I find?").
- The **1%-per-story** accumulation as the module's explainer, and the **24h-7d conversion cycle** (interest-to-decision time) as the pipeline health metric.

Account-level (his three-number dashboard + SooWei's weekly report):
- **Drop-off, opt-in rate, save rate** (save rate is undefined in all 124K words — v1 defines it as saves/reach on feed posts, flagged as our definition, or parks it).
- SooWei weekly set: **average views, net follower growth, ICP leads gained** ("out of 100 new followers, how many are ICP"), **follower-to-view ratio**, **$-per-follower** (the anti-vanity flagship: Dart $38/follower), **attributed booked calls per content piece** (our tracking rail), **follow-to-book duration** (compress 8mo -> weeks), and week-over-week comparison only.
- Business-level: revenue attribution by channel (his IG 60 / referrals 30 / YT 10 split as the template), **objection frequency** from call transcripts (3+ repeats = marketing problem -> content order), magnetic-audience baseline (the guaranteed view floor per post), format saturation clock (3-6 months per format -> reinvention due).
- Ideation (operator-side, optional v2): SooWei's 6-metric idea scorer (100K-view potential, pre-sell power, proven concept, ICP resonance, intrigue/payoff, brand alignment; 75 cutoff).

Data sources honestly stated: payments/webhooks = automatic (built); YouTube = API-able; IG story per-slide views = **manual entry v1** (no story API at our tier) with a fast entry form — exactly what Niksetting's VA does; attribution = our existing tracked-link pipe.

## Build phases (Codex work orders, each independently shippable)

1. **P1 — Auth + shell:** credentialed login on the existing portal, section navigation, Atelier/Mirage skin decision, section stubs with real data where it already flows (revenue from D1 payments; to-dos/plans/team as editable JSON per client).
2. **P2 — Content studio (sequences):** the generator contract wired to a UI (type/intent -> questions -> photo checklist -> copy out), uploads to client folder, operator review gate. The skill file is the single source of truth for the prompt contract.
3. **P3 — Metrics:** manual sequence-entry form + drop-off math + weekly report view; $-per-follower and follower counts; attributed-calls from the tracking pipe.
4. **P4 — YouTube pane + automations block + carousel studio** (carousel gate: framework page exists).
Gates: founder go before P1 fires; the standing rule that a mock precedes full build applies (P1 ships as a clickable mock first if the founder wants to see skin before wiring).

## Open questions (founder, no rush)

1. Skin: Atelier (built, unused) or Mirage-matched to the operator dashboard?
2. Operator review gate on generated sequences: default ON (recommended) or client self-serve?
3. Manual per-slide story views v1: acceptable? (It is exactly the source's own workflow.)
4. Login rollout: all clients or first paying client as pilot?

## Source trail

- Founder direction 2026-07-12 (this session). Metrics: Niksetting extractions 03/07/11/21c-d; SooWei extractions 01/03. Pre-built inventory: AGENT_CHAT + memory (integrations hub I1, portal links, view tracking, Atelier, dashboard vision).
