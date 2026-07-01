---
type: framework
tags: [typeform, application, funnel, landing-page, mmo]
sources: [[synthesis/landing-page-standard]], [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia]]
status: reusable-default
created: 2026-07-01
updated: 2026-07-01
---

# Generic make-money-online application questionnaire

The default Typeform for the application step of [[synthesis/landing-page-standard]].
Niche-agnostic — works for trading, dropshipping/ecom, Amazon FBA, TikTok Shop, or any
other biz-op mentorship. Swap the bracketed tokens per client and ship.

## Tokens to swap per build

- `[niche]` — trading / dropshipping / Amazon FBA / TikTok Shop / etc.
- `[mentor]` — the client's name
- `[outcome]` — the specific result their offer promises (e.g. "your first $10K month",
  "a funded payout", "consistent profits")

## The questions

**1. First, what should [mentor] call you?**
Short text, first name only. One-question-at-a-time keeps friction low here — this is
rapport, not qualification.

**2. Where are you at with [niche] right now?**
Multiple choice, monthly-result buckets (works across every niche because they all speak
in $/month):
- Just starting out
- Making some money, but inconsistent
- $1K–$10K/month
- $10K–$50K/month
- $50K+/month

**3. What's the biggest thing stopping you from [outcome]?**
Open text. This is the diagnostic question — it's what the sales call is actually built
around, and it's the single most useful field for whoever picks up the call.

**4. If this is the right fit, are you in a position to invest in yourself to make it happen?**
Multiple choice — the commitment filter:
- Yes, I'm ready
- I'd need to understand more first
- Not right now
This is the question most generic application forms skip. Per Grant Garcia's Typeform
prompt ("keep non-buyers out"), this is what actually separates tire-kickers from
serious applicants before they ever reach a call.

**5. How soon do you want this to change?**
Multiple choice — urgency/timeline:
- ASAP
- Within 30 days
- Within 90 days
- Just exploring
Feeds lead temperature. Pairs directly with the portal pipe's hot/warm tagging
(`output/standard-preview/functions/event.js` → Kit) — combine with VSL watch % to
separate hot leads from tire-kickers before a human ever looks at the list.

**6. Where should [mentor] send the next step?**
Email, required. This is the field the whole pipe keys off — it ties the application to
the VSL watch data and the Kit automation.

**7. Phone number** *(optional — include only if SMS reminders are part of the build)*
Short text / phone type. Needed for Grant's reminder-automation prompt (24h/12h/6h/1h
SMS before the call) if that's part of the delivery.

## Why this order

Rapport → segment → diagnose → filter commitment → urgency → contact. Each question
earns the next: by the time someone reaches the commitment question they've already
invested effort, so the filter works instead of just scaring people off at question one.

## Connections

- [[synthesis/landing-page-standard]] — the application sits directly under the VSL, this is what fills that slot
- [[raw-sources/scripts/AI-Launch-Prompt-Pack-Grant-Garcia]] — prompt #4, the source instruction this distills
- [[project_funnel_portal_pipeline]] — where the answers actually go (D1 + Kit tagging)

## Open questions / gaps

- Not yet tested against a real Typeform account — no live conversion data.
- Question 5 (urgency) is new versus the 4-field prototype already coded in
  `output/standard-preview/index.html`'s fallback form; that prototype should be updated
  to match if it's ever used as a non-Typeform fallback.
