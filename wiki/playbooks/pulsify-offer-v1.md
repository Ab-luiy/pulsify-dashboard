---
type: playbook
tags: [offer, pricing, performance-fee, risk-reversal, pulse-system, contract]
sources: [[wiki/concepts/pulse-system-mechanism]], [[wiki/people/abdullah-dagestani]]
created: 2026-05-10
updated: 2026-05-10
---

# Pulsify offer v1

The first commercial offer Pulsify sells. Built around [[concepts/pulse-system-mechanism|the Pulse System]]. Base fee plus performance share. Sold to coaches with a working offer and the will to execute. The headline guarantee is **$100,000 in new revenue within 90 days, or Pulsify works free until they hit it.**

> Risk-reversal under review: [[synthesis/offer-v2-risk-reversal]] proposes replacing the unbounded "$100k or free" headline with a credible, bounded, execution-gated structure that closes better in the trust recession and caps founder downside. Economics (base + performance) unchanged. Founder decision pending.

## Why this matters for Pulsify

This is the contract — what the prospect pays, what they receive, what they sign, what triggers exit. Without one canonical page, every sales call invents new terms and the offer drifts. v1 is the floor. It gets revised the moment v2 reality demands it.

## The offer in one sentence

Pulsify installs the full back-end of a coaching business — personal brand, content engine, funnel, sales infrastructure, and a custom AI agent that replaces a 3-person VA team — for a base fee plus a 25–30% performance share, and guarantees the client makes at least $100,000 in new revenue inside 90 days or we work free until they do.

## Pricing — the negotiation tree

Pricing is a negotiation, not a tier list. Sales-call logic:

1. **Open at $5,000 base + 30% performance.** This is the default and the floor on the base.
2. **If they object to the 30%:** drop to 25% but base moves to **$10,000**.
3. **If they object to the $10,000 base after a 25% drop:** settle at **$7,500 + 30%**.
4. **Hard floor:** $5,000 + 30%. Never below.

Both base AND performance fee are mandatory. There is no path that drops one. The base funds the build; the performance fee aligns Pulsify with growth. Skipping either breaks the model.

**Payment terms — base:** PIF or 50/50. 50/50 splits as half on call, half at funnel-stack delivery (week 5).

**Payment terms — performance:** weekly settlement against attributable revenue (see definition below). Reported every Friday from the integrated payment-processor view.

**Payment rails:** crypto via Binance Turkey (preferred) or international SWIFT bank transfer. No Stripe (Turkey constraint). No financing partner currently available.

## Performance fee — attribution and mechanics

**Attribution rule:** every dollar the client collects from the moment Pulsify is integrated into the business is attributable to Pulsify. Pre-existing leads already in flight at integration date are excluded — if a lead was scheduled to close before integration, that one revenue event does not count.

After integration, every revenue event counts because Pulsify owns the systems generating, processing, and tracking them: the CRM, the payment processor view, the Sales Co-pilot, the setters and closers (when present) reporting into the Pulsify Slack channel, the funnel, the content engine. The integration itself is the visibility mechanism — Pulsify cannot install the system without seeing what flows through it.

**Duration:** no ceiling, no time cap. The performance fee runs as long as the assets Pulsify built are running and the engagement is active. If the client wants to terminate the performance share, they terminate the engagement and Pulsify stops maintaining the system.

**Dispute resolution:** weekly Slack-channel report from setters/closers + payment-processor export are the source of truth. Both sides see the same data. Disputes are resolved against those records, not against subjective recall.

## Length of engagement and the $100k guarantee

**90 days paid.** That is the contractual delivery window for the build.

**Headline guarantee:** Pulsify guarantees the client collects at least $100,000 in new attributable revenue within 90 days of engagement start. If they miss, Pulsify continues working at no additional base fee until $100,000 is hit.

**Continuation has no time cap and no hour cap.** Pulsify continues as long as it takes. The performance fee continues to apply on revenue collected during continuation.

This is a hard guarantee on a guarantee-hard offer. The qualification gate (below) is what protects Pulsify from selling it to a client who cannot deliver execution.

## What the client gets

Week-by-week breakdown:

| Week | Deliverable | Owned by |
|---|---|---|
| 1 | Game-plan call. Account audits. Slack/Discord workspace. Payment-processor and CRM integration. Brand Brain intake interview. | Founder + client |
| 2 | Brand Brain populated. Profile audit complete. IG profile renovated. Unique mechanism named with the client. | Founder |
| 3 | Content Engine v1 live: research subroutine running, first 3 video angles approved, scripts drafted. | Founder + agent |
| 4 | First 2 long-form videos shot, edited, scheduled. Thumbnail patterns set. | Client (shoot) + founder (everything else) |
| 5 | Funnel Stack live: VSL drafted/recorded, Typeform built, Cal.com live, IG link-in-bio sequence wired. 50% payment due if on split. | Founder |
| 6–8 | Sales Co-pilot wired: pre-call briefs, proposal templates, CRM auto-updates. First sales calls run. Setters/closers (if present) onboarded into Slack. | Founder + agent |
| 9–11 | Ops Replacement live: comment triage, DM triage, dashboard refreshing daily. Weekly metric reports. | Agent |
| 12 | Day-90 review. Attributable revenue measured. If <$100k, continuation triggers. Case-study assets collected when goal hit. | Founder + client |

## Qualification — who Pulsify will work with

The qualifier is the discovery call, not a revenue floor. Pulsify makes a judgment call on the live discovery call whether $100k in 90 is achievable for this specific person. The factors that drive the call:

- **Has a working offer** — already converting at any price point. Or has an inbound lead Pulsify can close on the first call (cash-now path).
- **Audience or content already producing** — any channel showing engagement. Specific follower count is not a fixed gate.
- **Will to execute** — visible signal that they will hit cadence, attend calls, ship videos, take their own sales calls. This is the variable that decides everything.
- **Willingness to integrate** — they hand over CRM, payment processor view, and back-end systems. Without integration there is no attribution and no deal.

Revenue level is informative, not gating. A coach at $15–30k/month with the right audience and the right will hits $100k in 90 — that's well within Pulsify's confident range. A coach at $50k/month who refuses cadence does not.

## What disqualifies a prospect

- **No offer at all** ("I just post about trading"). They need offer creation first. Scope a separate $5k engagement, no performance fee on that scope.
- **Refuses integration** — won't grant payment processor or CRM visibility. No deal.
- **Demands lifestyle/flex content.** Hard no.
- **Demands faceless content.** Hard no.
- **Will not show up for cadence.** Disqualify on the call. The guarantee can't carry a client who won't carry themselves.

## On-call sales process

1. Inbound triggers: VSL → Typeform → Cal.com booking, OR DM reply → Loom send → Cal.com booking.
2. Pre-call: agent runs lead enrichment 30 min before. Founder reads brief in 60 seconds.
3. Call structure: Jeremy Haynes call funnel (see [[frameworks/call-funnel-framework]]).
4. Demo: 3-minute live agent demo. Default = "draft 10 video angles for your channel right now."
5. Pricing: open at $5k + 30%. Negotiate down the tree only if pushed.
6. Close: terms reviewed live, contract sent same day, payment terms confirmed.
7. If no close: 5-touch follow-up sequence runs over 30 days, drafted by Sales Co-pilot, approved by founder.

## Capacity

The founder can deliver up to 6 active clients in parallel before the operator role saturates. Each new client past 6 requires either (a) a price increase, (b) hiring a junior operator, or (c) tightening the agent to absorb more of the labor. Capacity drops during exam weeks — see [[playbooks/exam-mode-autonomous-ops]].

## What the client does NOT get in v1

- No paid-ad management. Profile-funnel ads are a v2 add-on once organic content is producing.
- No live webinar build. Webinars require audience size most v1 clients lack. See [[frameworks/webinar-framework]].
- No sales-team build (recruiting setters/closers from scratch). Founder runs sales calls in v1; if the client already has setters/closers, Pulsify integrates them.
- No course platform setup (Skool, Kajabi). v1 assumes the coach already has a delivery container.

## Connections

- [[concepts/pulse-system-mechanism]] — the mechanism this offer monetizes.
- [[wiki/people/abdullah-dagestani]] — the founder who delivers it.
- [[playbooks/exam-mode-autonomous-ops]] — what runs when the founder is in exams during a 90-day window.
- [[playbooks/pulsify-delivery-sop]] — week-by-week delivery SOP.
- [[playbooks/pulsify-funnel-v1]] — the inbound funnel that produces these prospects.
- [[clients/nick/overview]] — the prior engagement whose churn lessons drive the integration and execution-gate requirements.
- [[frameworks/call-funnel-framework]] — the call structure used to close.

## Open questions / gaps

- **Recorded risk on the unbounded guarantee.** The $100k-in-90 guarantee with no time cap, no hour cap, no client-side execution gate is high-conviction by the founder ("it is so fucking easy"). The structural risk is concurrent failures during a capacity-constrained period (e.g. exam weeks): two clients missing the goal would fully consume founder time at zero marginal revenue while five other engagements are still active. Mitigations to consider as the offer matures: (a) add a client-side cadence gate (two missed weeks voids continuation), (b) cap continuation at 6 months total engagement, (c) raise the qualification bar after the first miss. None of these are in v1 — flagged here so future-you can find this when the first stress event arrives. Founder accepts the risk knowingly as of 2026-05-10.
- No prior engagement has run on these exact terms. First paid v1 client becomes the proof and the source of revisions.
- Legal: contract template drafted at [[playbooks/pulsify-contract-template-v1]] (2026-05-15). Open items on the template: jurisdiction confirmation (UK vs other), Pulsifymedia LTD signer name/title, optional standalone NDA variant.
- Crypto-only payment may disqualify some prospects. Backup option (Wise, Payoneer) needs evaluation.

## Source trail

- Founder voice notes, 2026-05-10 (interview + pricing/risk-reversal clarifications).
- [[concepts/pulse-system-mechanism]].
- [[clients/nick/overview]] — churn-mode evidence behind integration requirement.
