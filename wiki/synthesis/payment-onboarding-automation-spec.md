---
type: synthesis
tags: [sales, funnel, offer, scaling]
sources: [[wiki/lint-report]], [[playbooks/prospect-signed-onboarding]], [[playbooks/pulsify-delivery-sop]], [[synthesis/funnel-portal-pipeline]], onboarding-form memory note
created: 2026-07-03
updated: 2026-07-03
---

# Payment-triggered onboarding automation (spec)

Founder ask, 2026-07-03: when a client pays, a trigger fires — the client gets an email with the onboarding form, the money is recorded on our side, and onboarding starts without anyone remembering to do it. This page is the design; Codex builds it (no code exists yet). It automates steps 3-6 of [[playbooks/prospect-signed-onboarding]] and finally gives the operator dashboard's Revenue section real data (`payments.live`).

## The shape

One new concept in the existing pipe: a **payment event**, landing on the same pulsify-funnels Cloudflare/D1 infrastructure everything else uses.

```
payment happens (any rail)
        v
POST /api/payment  (two ways in: webhook OR operator "Mark paid" button)
        v
D1 payments table row  (client, amount, currency, rail, date, reference)
        v  fires, fail-soft, in order:
1. Kit email to the client: welcome + onboarding-form link + portal link
2. Portal token minted automatically (if none exists) -> included in that email
3. client_config flipped to status "client" (pipeline stage auto-advance signal)
4. Operator notified (dashboard Today queue + email)
        v
form responses come back through the existing Typeform webhook -> /event pipe
        v  stored per client, surfaced in /portal + clients/{name}/overview.md
```

The system records money and reacts to it. It never moves money — rails stay external.

## The two ways in (build both, B first)

**A. Webhook path** — a payment platform calls `/api/payment` directly. Only possible on rails that have webhooks (Stripe, Whop, Fanbasis, Lemon Squeezy / Paddle as merchant-of-record options that work for Turkey-based founders). Signature-verified per platform, idempotent by payment reference.

**B. Operator path — "Mark paid" (the universal fallback).** One button in `/settings` (or `/portal`) per client: amount, currency, rail, reference note -> fires the exact same `/api/payment` flow. This works TODAY with the documented reality of SWIFT transfers and crypto into Binance Turkey (lint L4) — rails that will never send a webhook. B is the MVP; A is an upgrade per rail.

**Gating decision (founder):** which payment rail is the standard one going forward? The vault currently says three different things (crypto/SWIFT in the delivery SOP, Stripe in its tools table, "Turkey payment rails" in the contract template — lint L4). If the answer stays SWIFT/crypto, path B alone is the build and A is dropped until a platform rail exists.

## The onboarding email (Kit)

Sent on the payment event, in the client's-coach voice = Pulsify's voice rules:
1. Confirmation of what was received (amount, what it covers — from the payment row, never invented).
2. The onboarding form link (below).
3. Their private portal link (auto-minted token).
4. What happens next: game-plan call within 72h per [[playbooks/pulsify-delivery-sop]] pre-engagement.

Blocker: Kit account still doesn't exist (standing user-side item). Until it does, the function falls back to a mailto-able draft surfaced to the operator rather than silently failing — same fail-soft doctrine as the rest of the pipe.

## The onboarding packet (updated 2026-07-03 — founder supplied the real assets)

The form is NOT a Typeform to be built — it already exists as a live **Google Form** (30 questions: contact/timezone, niche, offer + pricing, last-3-months revenue, income goal, platforms + audience sizes, story views, lead sources, buying path, current funnel + links, content winners/losers, inspirations, bottlenecks, weekly hours, offline dates, launch plans, account links, access needs, optional login paste, confirmation). Alongside it: the **CO1 Full Onboarding Doc** (Google Doc, phased client checklist: expectations video -> surveys -> voice-memo research -> Drive/Stripe access -> Discord, Kit, Zapier, Typeform, Calendly, Fanbasis PIF + Whop BNPL setup).

So the payment-event email sends THREE links: the Google Form, the CO1 doc, and the auto-minted portal link.

**Google Forms has no native webhooks.** V1: the automation sends the link and the operator reads responses in the linked Sheet (zero build). V2 (optional later): a small Apps Script on-submit trigger POSTs responses to the existing `/event` pipe with `kind: onboarding` so they land in D1/portal. Do not block v1 on v2.

**Gap the form still has (lint L8, revised):** the buyer-psychology win-reason questions from the memory note (what made you believe us / what almost stopped you / what we could have improved / which video converted you) are NOT among the 30 — the form is logistics intake. Add those 4 as a final section of the same form (5 minutes in the Forms editor, founder-side) — they are the only questions that feed funnel attribution and content angles.

## What it unlocks downstream

- **Revenue section goes live.** The payments table is the first verified payment data the operator dashboard has ever had — `payments.live === true` gets flipped by real rows, not demo data (standing truth-state rule).
- **Pipeline auto-advance.** The renovation spec's staged CRM ([[synthesis/client-acquisition-renovation-2026-07-03]] Part 2) gets its "Signed -> Client" signal for free.
- **Attribution.** Q6 answers tie closed revenue back to specific videos — the first real content-to-cash data point.

## Acceptance (for the build, when claimed)

- `POST /api/payment` idempotent by reference; unauthenticated requests 401 (operator path) / bad signature rejected (webhook path); payment rows never deletable via API.
- "Mark paid" -> client receives one email containing a working form link and a working portal link; second click with the same reference does not double-send.
- Kit absent -> flow completes, operator gets the draft, failure logged to `delivery_failures`, nothing thrown.
- Form submission -> row visible in `/portal` within one refresh; no cross-tenant leakage (same resolveAccess pattern as `/leads`).
- Revenue tile on the operator dashboard renders the row with an honest freshness stamp.

## Open questions / gaps

- The rail decision (L4) — gates path A entirely.
- Q1/Q3 of the questionnaire — founder input.
- Where "Mark paid" lives (settings vs portal vs dashboard) — builder's call, one place only.
- Refunds/partial payments — out of scope v1; a payment row is append-only, corrections are new rows with negative amounts.

## Connections

- [[wiki/lint-report]] — L4 and L8 are this spec's two blockers
- [[playbooks/prospect-signed-onboarding]] — the manual checklist this automates the middle of
- [[synthesis/funnel-portal-pipeline]] — the pipe this rides
- [[synthesis/client-acquisition-renovation-2026-07-03]] — consumes the payment signal in Waves 1-2

## Source trail

Founder voice instruction 2026-07-03 (this session); [[playbooks/pulsify-delivery-sop]] pre-engagement + tools table; onboarding-form memory note (question set, trigger convention); funnels pipe architecture from [[synthesis/funnel-portal-pipeline]] and the deployed source.
