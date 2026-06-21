---
type: framework
tags: [funnel, sales, ads, kpi, scaling, jeremy-haynes]
sources: [[raw-sources/frameworks/Call-Funnel-Framework-Jeremy-Haynes.md]]
created: 2026-05-02
updated: 2026-05-02
---

# Call funnel framework

The call funnel framework is Jeremy Haynes' financial model and operational system for building, running, and scaling a paid-traffic call funnel for high-ticket offers. It covers the math of scaling, the mechanics of the hammer them strategy, ad fatigue management, KPIs, and the disposition tracking system that makes a call floor manageable at scale.

## Why this matters for Pulsify

The call funnel framework is the endgame infrastructure for Pulsify clients who reach paid ads phase (step 15–16 in [[pulsify-order-of-operations]]). It is not for day-one clients. It is for clients who have proven their offer, built their funnel, and have the budget to scale. Understanding the math ahead of time shapes every earlier decision: offer price, close rate target, and ad budget thresholds.

## Core mechanics

### The financial model

The call funnel is built backwards from revenue targets. The key variables:

- **Offer price** — determines how many closes are needed to hit the monthly target
- **Close rate** — industry average for warm calls: 20–30%. A well-run funnel with hammer them reaches 40–60%.
- **Show rate** — industry average: 40–50%. With full hammer them implementation: 60–70%+.
- **Calls booked per day** — derived from the ad spend and cost per booked call (CPBC)
- **Cost per booked call (CPBC)** — the critical scaling metric. Drives budget decisions.

**Example math (simplified):**
- Target: $100,000/month revenue
- Offer price: $5,000
- Closes needed: 20/month
- Close rate: 30% → calls needed: 67/month (approx. 2.5/day)
- Show rate: 50% → calls booked needed: 134/month (approx. 4.5/day)
- If CPBC = $200 → ad spend needed: $26,800/month

This math makes the scaling decision explicit: you cannot reach $100K/month with a $5K offer at a 30% close rate and $200 CPBC on $5,000/month in ad spend.

### Hire ahead of demand

One of the most counterintuitive principles in Jeremy's framework: hire sales reps, setters, and support before you have the volume to justify them. Reason: if you wait until volume overwhelms you, the bottleneck is the hiring and training lag (typically 4–6 weeks). By the time the new hire is productive, you have already lost weeks of revenue.

Practical application:
- When show rate is consistently above the floor threshold, hire a second closer
- When inbound DM volume exceeds 2 hours/day to manage, hire a setter
- When ad spend exceeds what one campaign manager can optimize, hire or contract help

### The burn budget

Every new ad campaign has a "burn budget" — the amount of money required to generate enough data to make optimization decisions before the campaign is profitable. Jeremy specifies:

- Burn budget exists per campaign, not per ad set
- Attempting to optimize with too little spend produces bad data and misleading signals
- The burn budget is not a failure — it is the cost of learning

Pulsify clients need to understand this before activating paid ads. A client who expects immediate ROAS from a cold traffic campaign without a burn phase will shut down ads prematurely and attribute failure to the channel rather than to premature optimization.

### Ad fatigue management

High-frequency targeting to a small audience burns out creatives faster. Key mechanics:

- **Frequency cap awareness** — once a prospect has seen an ad 3–5+ times, performance drops
- **Creative rotation** — new creatives must be in production continuously, not batched at launch and left
- **Audience expansion** — as warm retargeting audiences saturate, cold traffic audiences must expand
- **The creative production bottleneck** — at scale ($50K+/month ad spend), the limiting factor is often creative volume, not budget

This connects directly to [[hammer-them-strategy]]: the retargeting pieces required for hammer them also serve as the creative rotation pool. Building hammer them content is also building ad creative inventory.

### The KPI system

Jeremy's tracked KPIs for a call funnel operation:

| KPI | Definition | Target range |
|---|---|---|
| Cost per click (CPC) | Ad spend / clicks | Depends on niche |
| Cost per lead (CPL) | Ad spend / leads | $5–$50 (varies widely by niche) |
| Cost per booked call (CPBC) | Ad spend / booked calls | Track over time, optimize toward |
| Show rate | Showed / booked | 60–70%+ with hammer them |
| Close rate | Closed / showed | 20–30% baseline, 40–60% with pre-frame |
| Cost per acquisition (CPA) | Total spend / closes | Revenue target / margin threshold |
| Revenue per call (RPC) | Total revenue / calls taken | Key scaling metric |

The only KPIs worth optimizing at any given time are the ones creating the bottleneck. If show rate is 65% but close rate is 18%, the bottleneck is the close — not the funnel. Optimize close rate, not ad spend.

### Disposition tracking system

A disposition is the outcome assigned to each booked call. Jeremy's system tracks every call with a disposition code so the math is always current. Core dispositions:

- **Show / No-show** — attended or didn't
- **Closed** — enrolled, money collected
- **Not now** (rescheduled) — interested but wants to talk again
- **Not qualified** (NQ) — wrong ICP, not financially qualified, not a fit
- **Not interested** — attended, understood, declined
- **Nurture** — long-term prospect, needs more time

Aggregate disposition data reveals which stage is the bottleneck:
- High no-shows → hammer them is missing or underpowered
- High NQ rate → lead qualification upstream is broken (wrong targeting or wrong ICP messaging)
- High not-interested rate → either wrong ICP reached call, or the offer/pitch is missing something
- High close rate with low volume → scale ad spend; the funnel is working

Every Pulsify client operating a call funnel needs a disposition tracker. Without it, the operator is managing a math problem without the numbers.

### The scaling ceiling

Jeremy identifies the practical scaling ceiling for a solo operator:
- Beyond ~$50K/month revenue, a solo closer becomes the bottleneck
- At $100K+/month, you need at minimum: 1 dedicated closer, 1 setter, 1 campaign manager
- At $400K+/month (Devon benchmark): full team, multiple closers, creative production pipeline, dedicated ad buyer

The $100K→$400K/month result Jeremy documented for Devon was achieved through systematic application of this framework with proper team infrastructure in place.

## How Pulsify uses this

At early stages (Marcus-stage clients), Pulsify uses this framework to build forward-looking financial expectations and to educate clients on what scaling actually requires. Most Marcus-stage clients underestimate ad spend requirements and overestimate close rates.

At later stages (step 15–16 in [[pulsify-order-of-operations]]), this framework governs ad activation decisions: is the CPBC sustainable? Is the show rate high enough to justify scale? Is the close rate strong enough that increasing ad spend will compound rather than expose a broken funnel?

## Connections

- [[hammer-them-strategy]] — the show rate mechanism that makes the call funnel math work
- [[vsl-framework]] — the lead generation and qualification mechanism feeding the call funnel
- [[webinar-framework]] — an alternative funnel architecture with different math
- [[pulsify-order-of-operations]] — where call funnel activation sits in the full sequence
- [[jeremy-haynes]] — source of this framework

## Open questions / gaps

- The specific CPBC benchmarks for each biz-op niche (trading vs. dropshipping vs. Amazon FBA) are not documented. These vary significantly and need to be tracked per client.
- The disposition tracker template referenced by Jeremy is not in raw-sources. Needs to be built or sourced.

## Source trail

- [[raw-sources/frameworks/Call-Funnel-Framework-Jeremy-Haynes.md]]
