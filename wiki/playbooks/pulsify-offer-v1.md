---
type: playbook
tags: [offer, pricing, performance-fee, guarantee, contract]
sources: [[synthesis/mvp-readiness-and-pricing-2026-10-12]], [[synthesis/onboarding-v2-spec-2026-10-15]], [[synthesis/service-scope-and-terms-proposal-2026-10-26]], [[clients/tb-tradez/contract-draft]], [[wiki/people/abdullah-dagestani]]
created: 2026-05-10
updated: 2026-10-26
---

# Pulsify offer

What a client pays, what we do, what they do, and how it ends. This page matches the contract the app sends from the booked pipeline (`output/standard-preview/functions/_shared/contract-text.js`, pulsify-saas #80). If the two ever disagree, the app's contract is what the client signs, so fix this page or the contract the same day.

> **Rewritten 2026-10-26.** The May version promised "$100,000 in 90 days or we work free", a 90-day paid term and weekly settlement. Those terms are retired. They are summarised under "What changed" at the bottom so nobody revives them by accident.

## Why this matters for Pulsify

Every sales call needs one set of terms. If the page, the contract and the call say different things, the client finds the gap and the deal drifts or dies.

## The deal

- **Price:** $5,000 upfront plus 30% of what they collect from what we build together (founder 2026-10-15).
- **What the 30% covers:** everything after they join, from content to funnel to closing. Money they already make from content before joining is not touched, unless we rebuild that stream, and then it counts too.
- **Starting revenue:** written into the contract at signing. Onboarding asks for the last three months exactly, so the number is real.
- **Refunds and chargebacks** come off before the 30% is worked out.
- **When we get paid:** within 5 business days of them receiving the money.
- **Late or missed payment** pauses our work until it is paid.
- **How they pay:** crypto (USDT or USDC) or bank transfer. No Stripe, because it is not available in Turkey.
- **No refunds** on anything paid.

### When the pricing gets pushed

The May negotiation tree is still the reference if a prospect pushes: drop to 25% only if the base goes up to $10,000, settle at $7,500 + 30% if they push again, and never go below $5,000 + 30%. Two signed deals broke it: FITFO ($0 upfront, 30%, first $3,000 to us) and TB Tradez ($0 upfront, 35%). Doctrine stays: the upfront is not negotiable and a price objection is usually a smokescreen ([[claude-memory/feedback_price_objection_smokescreen]]).

## How long it runs

There is no end date. It runs until either side says stop, by message, with no notice period and no penalty.

When it stops:
- They keep everything we built for them.
- Deals already in progress that close within 30 days still pay the 30%.

## What we do

We do the work that makes them money (founder's scope reference: Cardinal Mason's "Our work" slide).

- Their offer, positioning and unique mechanism.
- Their YouTube videos planned for them: idea, outline in their words, two titles and two thumbnails, and a story sequence to push each one.
- Their Instagram profile: bio, highlights, story sequences, and carousels when something big happens.
- Their funnel from the first click to the booked call, tracked the whole way, plus payment-processor setup.
- Their paid program: curriculum, how they run 1-1 calls, teaching material, a sheet of who paid and who didn't, and Whop if they host there.
- Setters and closers, found, trained and managed by us when the offer is ready to scale.
- Paid ads as a later phase, or early if they want to scale fast. Organic first.
- The app, a weekly review and weekly reports.

**The sales team is paid out of our 30%:** 10% to the closer, 5% to the setter, 15% to us. The client pays nothing extra. Until there is a team, we do that work and keep the full 30%.

## What they do

The parts only they can do (the onboarding "deal" screen):
- Record their videos. 1 to 2 a week is the standard, and they can change it.
- Post their own reels, 2 to 5 a day, raw and unscripted. We never script reels.
- Show up to the weekly review and approve drafts.
- Reply to their leads, take their calls and look after their students.

If the content doesn't go out, nothing we build can work.

## The guarantee

Approved wording, used word for word in the contract and onboarding (founder 2026-10-15):

> "Your workspace is live and tailored to you the day you finish onboarding, and your first video package and story sequence follow right after. If anything we promised isn't delivered, we keep working at no extra cost until it is. No refunds."

We guarantee what we control, which is the work. We never promise a revenue number.

## Who we work with

- Creators in our seven niches who do the craft themselves ([[claude-memory/feedback_our_niches_only]]).
- They have something to sell, or are willing to build an offer with us.
- They will show up: film on cadence, attend calls and take their own sales calls. That is what decides the result.
- They give us access to their accounts so the app can track the money.

Hard no: lifestyle or flex content, faceless content, or someone who won't keep cadence.

## Lessons from the calls (still apply)

### Never accept a deferred renegotiation

Proven on the FITFO call, 2026-07-29. When a prospect wants to settle the split after the first money comes in, refuse and lock every term before work starts. By that later call we hold a finished build and they hold all the leverage. Say the split out loud on a recorded call, get an explicit yes ("Afterwards, 70/30 applies. We cool?"), and send them the recording.

### Answer a termination question with a clause

Also from the FITFO call. When a prospect asks "what happens if this doesn't work out", answer with the clause: either side can stop by message, they keep what we built, and deals in progress that close within 30 days still pay the share. A reassuring story is not an answer.

## Capacity

The founder can run about 6 active clients before the operator role saturates. Past that: raise the price, hire a junior operator, or let the app take more of the work.

## What changed on 2026-10-26

Retired from the May page:
- The "$100,000 in 90 days or we work free until you hit it" guarantee. It was replaced by the delivery guarantee above, because a big revenue promise reads like every guru in a trust recession ([[synthesis/offer-v2-risk-reversal]]).
- The 90-day paid term and the day-90 review. There is no end date now.
- Weekly Friday settlement. The share is now due within 5 business days of each payment.
- "Every dollar after integration counts". The share now covers revenue from what we build together, net of refunds, with starting revenue recorded.
- "No sales-team build" and "no paid ads". Both are now in scope, as above.
- "Pulsifymedia LTD". There is no registered company. Contracts are made as Pulsify ([[clients/tb-tradez/decisions]]).

## Connections

- [[playbooks/pulsify-contract-template-v1]]: the contract text, which mirrors the app's.
- [[synthesis/service-scope-and-terms-proposal-2026-10-26]]: what is settled and what is still left for the first client.
- [[synthesis/onboarding-v2-spec-2026-10-15]]: the "deal" screen the client confirms before finishing onboarding.
- [[playbooks/pulsify-delivery-sop]]: week-by-week delivery. Its $100k and day-90 sections are out of date.
- [[clients/nick/overview]]: the case study.

## Open questions / gaps

- **Who edits the videos.** The delivery SOP has us editing, while the contract only says the client records and publishes. Not settled.
- **The app cannot send a contract yet.** DocuSign is linked, but the three sending keys are not set.
- **The zero-floor risk on performance-only deals** (TB Tradez) is still unresolved. A longer tail was proposed and never agreed.

## Source trail

- Founder voice notes, 2026-05-10 (original offer).
- Founder decisions, 2026-10-12 and 2026-10-15 ([[synthesis/mvp-readiness-and-pricing-2026-10-12]]).
- Founder, 2026-10-26: add setters/closers 10/5/15, ads later and program building to the contract.
- FITFO and TB Tradez agreements ([[clients/tb-tradez/contract-draft]]).
