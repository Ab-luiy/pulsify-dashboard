---
type: framework
tags: [ai, prompts, launch, offer, vsl, lander, typeform, automations, sales-team, story-sequence, grant-garcia]
sources: [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia.md]]
created: 2026-05-06
updated: 2026-05-06
---

# AI launch prompt pack (9-step)

A complete prompt pack for launching a high-ticket coaching/mentorship offer using 90%+ AI. Sequenced from offer creation through testing. Originally built around Sire Abram's Vantage Education trading mentorship ($400K/5 days), but the scaffolding is niche-agnostic — swap niche, ICP, results, and the prompts produce a launch-ready stack for any biz-op coach.

## Why this matters for Pulsify

This pack is the operational backbone of Pulse Brain (the sales/conversion module of [[concepts/pulse-system|The Pulse System]]). Each prompt corresponds to a piece of infrastructure Pulsify builds for clients — and increasingly, builds *for prospects in the DM* per [[playbooks/ai-outreach-grant-method]]. The same prompts that close a Marcus on a call build that Marcus's launch the day he signs.

The pack also formalizes a position Pulsify has been edging toward: a high-ticket coaching launch is no longer a 60-day rebuild project requiring a team of contractors. It is a 7–14 day AI-led build executed by one operator using a $20/month tool stack.

## The 9 prompts (and what each replaces)

| # | Prompt | Replaces / shortens |
|---|---|---|
| 1 | **Offer creation** — generates 3 high-converting offers (price, bonuses, guarantee, urgency, hook) | Days of offer-architecting; produces 3 testable variants in one pass |
| 2 | **VSL scripting** — invokes Jeremy Haynes' [[frameworks/vsl-framework]] + competitor VSLs as references | Hiring a VSL copywriter ($3K–$10K) |
| 3 | **Landing page** — Carrd step-by-step OR Lovable AI template, modeled on a competitor URL | Hiring a designer + dev (~$2K–$5K) |
| 4 | **Typeform application** — qualification questions + logic routing | Cuts 30–60% of unqualified call bookings that drain closer time |
| 5 | **Automations** — Typeform → Close CRM → Slack notification, with smart-view tagging | Replaces a Zapier consultant or a half-built ops setup |
| 6 | **Pre-call asset delivery** — confirmation page + 45-sec objection-handling video scripts + email cadence | Targets [[concepts/hammer-them-strategy]]'s 60–70% show rate without manual production |
| 7 | **Sales team training** — daily SOP, scripts (setter + closer), objection scripts, follow-up cadences, roleplay scenarios, onboarding quiz | Weeks of sales training compressed into a starter pack |
| 8 | **Story sequences** — 7-day Instagram launch arc with hook/body/CTA structure | Replaces hiring a content lead for the launch window |
| 9 | **Testing & troubleshooting** — full QA checklist for every funnel stage | Catches the 1–2 broken integrations that silently kill a launch |

## Core mechanics

### Each prompt assumes three context inputs

Every prompt expects, attached or pasted:
- Client offer details
- Student results / case studies (real numbers, real testimonials)
- A reference asset for the operation in question (competitor lander, competitor VSL transcript, framework transcript, etc.)

Prompts that lack all three inputs produce generic output. The quality of the launch is bounded by the quality of the context fed into the prompts. This is consistent with Grant's "AI is leverage, not a replacement for your brain" rule and with Pulsify's own [[concepts/unique-mechanism]] discipline (specificity is the mechanism).

### Reference assets baked into the pack

The launch pack ships with two full competitor VSL transcripts:
- **Sire Abram's Vantage Education VSL** — the trading mentorship VSL that produced the $400K/5-day result. Useful as a reference for any biz-op offer where the buyer has direct ROI mindset.
- **Grant Garcia's "The Reserve" VSL** — Grant's own program VSL targeting aspiring growth operators. Useful as a reference for Pulsify's own future VSL when we build it.

These are stored in [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia.md]] and should not be reproduced verbatim in client work — they are reference scaffolding, not copy.

### Sequencing matters

The prompts are ordered for a reason:
1. Offer must exist before VSL can be scripted.
2. VSL output feeds the lander headline + intro.
3. Lander structure dictates the Typeform embed location and pre-call sequence.
4. Automations require all the above to exist before they can be wired.
5. Pre-call assets reference the offer's specific objections.
6. Sales training references the offer + results + scripts.
7. Story sequences are the launch hype layer, run after the funnel is wired.
8. Testing comes last — full QA before going live.

Skipping the sequence breaks downstream prompts because each depends on the upstream output as context.

### What the pack does NOT replace

- The 15-minute research protocol from [[playbooks/ai-outreach-grant-method]]. Cannot be AI'd.
- The strategic decision of which offer to put live (the prompts produce 3 candidates; the operator picks).
- Recording the VSL on camera (the script is generated; the founder still has to deliver it).
- The actual sales call. AI sets up the conditions for the close — the closer still closes.
- Onboarding fulfillment. The pack ends at "first call closed." Fulfillment is a separate system.

## How Pulsify uses this

Two modes:

**Mode 1 — Outreach asset (used inside Pulse Engine outreach):** Pull prompt 2 (VSL), prompt 3 (lander), or prompt 4 (Typeform) — pick whichever matches the gap diagnosed in the prospect's funnel. Build the asset in 15–30 min. Send it in the DM. See [[playbooks/pulse-system-outreach]] for the full play.

**Mode 2 — Client launch (used after a Marcus signs):** Run all 9 prompts in sequence inside the client's project folder. Day 1–2: prompts 1–2 (offer + VSL). Day 3–4: prompts 3–5 (lander + Typeform + automations). Day 5–7: prompts 6–7 (pre-call assets + sales training). Day 8–10: prompt 8 (story sequence). Day 11: prompt 9 (testing). Day 12: launch.

This compresses what was historically a 30–60 day client onboarding into ~12 days, which is the productivity claim Pulse Brain makes externally and the proof Pulsify needs internally to justify pricing.

## Connections

- [[playbooks/ai-outreach-grant-method]] — the outreach playbook these prompts power
- [[playbooks/pulse-system-outreach]] — Pulsify's voiced version, anchored on The Pulse System
- [[frameworks/vsl-framework]] — Jeremy Haynes' framework the VSL prompt invokes
- [[frameworks/call-funnel-framework]] — the financial model the launch is built to feed
- [[concepts/hammer-them-strategy]] — what prompt 6 (pre-call assets) operationalizes
- [[concepts/pulsify-order-of-operations]] — these prompts execute steps 4 through 12 of the order of operations at AI speed
- [[playbooks/offer-creation]] — what prompt 1 systematizes

## Open questions / gaps

- The pack assumes Lovable AI is available. If a client prefers Webflow, Carrd, or Framer, the lander prompt needs a tool-specific variant. Easy fix; flag when needed.
- Prompt 5 (automations) hardcodes Close CRM. Other CRMs (HubSpot, GoHighLevel) need their own variant.
- No prompt yet for ad copy or paid launch testing. Pulsify will need to add a 10th and 11th prompt when paid traffic enters the standard launch — see [[concepts/pulsify-order-of-operations]] step 14.
- The sales team training prompt assumes a sales team exists. For solo Marcuses without a setter, an "AI setter / solo operator" variant is needed.

## Source trail

- [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia.md]]
