---
type: synthesis
tags: [delivery, automation, pulse-system, saas, funnel, sales]
sources: [[wiki/playbooks/pulsify-delivery-sop]], [[wiki/playbooks/pulse-system-stack]], [[raw-sources/prompts/sales-precall-brief-prompt]], [[raw-sources/prompts/weekly-client-report-prompt]], [[raw-sources/prompts/client-diagnosis-prompt]], [[raw-sources/prompts/client-vsl-writer-prompt]]
created: 2026-09-23
updated: 2026-09-23
---

# Service delivery automation, September 2026

Where the 12-week delivery SOP now runs by itself inside the platform, what shipped on 2026-09-23, and the ranked list of what to automate next. Read this before building any new delivery feature.

## Why this matters for Pulsify

The offer sells operator judgment plus agent labor ([[concepts/pulse-system-mechanism]]). Every hour the founder spends pasting data into a prompt is labor the platform should carry, and every automated routine is a line the SaaS can sell. The checkpoints stay human: angle selection, voice approval, the call itself, every outbound message ([[playbooks/pulse-system-stack]]).

## What runs by itself now

| SOP step | Before | Now | Checkpoint |
|---|---|---|---|
| Welcome, login, checklist (pre-engagement) | Manual | Provisioning on DocuSign, payment or button; welcome email; 8-step checklist with auto-complete | None needed |
| Brand Brain intake (week 1) | 90-min interview into a Claude project | 8-section client brain in the portal, voice notes transcribed into it, context export | Founder fills operator fields |
| Pre-call brief (weeks 6 to 8) | Founder runs the prompt 30 minutes before each call | Every Cal.com or Calendly booking gets a brief built from the application answers, landing-page views, watch time and brain offer; filed in the client's call notes, bell for both sides. Shipped 2026-09-23 | Closer reads, decides |
| Call records (week 1 onward) | Transcript pasted by hand into `clients/{name}/calls/` | Fathom meetings with a client invitee land in call notes with the Fathom summary and action items every 30 minutes. Shipped 2026-09-23 | Founder reviews action items |
| Weekly report (weeks 6 to 12) | Founder pulls numbers Monday and runs the prompt | Monday 09:00 Istanbul: a draft per active client from real payments, applications, bookings, page and video numbers and shipped work, parked in Email drafts. Shipped 2026-09-23 | Founder fills this week and needed-from-you, then sends |
| Payments into revenue | Screenshots | One-key Stripe or Whop connect, 90-day import, lead matching | Founder confirms suggested matches |
| Story sequences and carousels (week 3 onward) | Written from the frameworks by hand | Studio generators carry [[frameworks/story-sequence-system]] and [[frameworks/carousel-system]] | Client submits, founder approves |
| Outreach replies (Pulsify's own pipeline) | Checking the inbox | Bell pings only for replies to our outreach and approved prospects; daily follow-up summary | Founder writes the reply |

## Blocking gap: no model key in production

As of 2026-09-23 the Pages project has no `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`. The content studio, copywriter and carousel generator fall back to manual copy-a-prompt mode, and the new automations run on Cloudflare's built-in Llama 3.3 70B. Briefs and report drafts work but read flatter than Claude. Adding `ANTHROPIC_API_KEY` to the Pages project switches every one of them to Claude (`functions/_shared/llm.js` picks it first) with no code change.

## Where the reference knowledge feeds in

- **Nick ([[clients/nick/overview]]):** the only confirmed client proof. It belongs in the proof section of Pulsify's own client brain so every generator that reads proof uses the real numbers, never the founder's recalled ones.
- **Niksetting ([[people/niksetting]]):** sequence and carousel structure is in the studio generators. The [[frameworks/proof-system]] and [[frameworks/messaging-reframe-system]] are not yet in any generator.
- **SooWei Goh ([[people/soowei-goh]]):** the six-metric idea scorer is the spec for the weekly angle research step, which is still manual.
- **Prospect research ([[playbooks/prospect-research-sop]]):** the Creator Profile it produces is the same shape as the client brain. A signed prospect's research should seed their brain on day one instead of being re-asked in the intake.

## Next builds, ranked by founder hours saved

1. **Diagnosis doc generator.** One button in Client brain runs [[raw-sources/prompts/client-diagnosis-prompt]] on the brain plus connected data and files the draft in Client work, Assets. Week 1 deliverable, currently fully manual.
2. **Prospect research seeds the brain.** When an outreach prospect signs, copy their Creator Profile into the brain fields with source "research". Removes half the intake interview.
3. **Call actions to brain suggestions.** From a filed Fathom call, extract proposed brain updates and decisions; founder accepts each with one click. Closes the loop the SOP runs by hand after the game-plan call.
4. **Proof and reframe generators.** Add the proof-system and messaging-reframe frameworks as studio types (proof pin post, category-of-one statement, bio rewrite per [[frameworks/bio-optimization-system]]).
5. **VSL script from the brain.** Run [[raw-sources/prompts/client-vsl-writer-prompt]] for week 5, output to Client work, founder edits.
6. **Weekly angle research.** Scheduled niche scan scored with the SooWei six metrics, 10 ranked angles into the client's Content board. Founder still kills 7 of 10.
7. **Pulsify's own sales calls.** Fathom meetings with an outreach prospect (not a client) should brief and file against the CRM record the same way client bookings do.

## Open questions / gaps

- Integration secrets (Stripe keys and others) sit as plain JSON in D1. The webhook secrets use the encryption box; the integration table does not yet. Worth moving before more clients connect.
- Fathom matching uses the client's login email only. A client who joins calls from another address is missed until the brain stores alternate emails.
- The weekly report counts all payments on the client's record as attributable revenue. That matches how revenue is tracked today but should be checked against the contract definition before the day-90 review.

## Source trail

- Code: `functions/_shared/delivery-automation.js`, `functions/_shared/llm.js`, `functions/api/automations.js`, `workers/sync/src/index.js` (crons), tests in `tests/delivery-automation.test.mjs`.
- [[playbooks/pulsify-delivery-sop]], [[playbooks/pulse-system-stack]] for the SOP steps and checkpoint rules.
- Production secret inventory read with `wrangler pages secret list` on 2026-09-23 (names only).
