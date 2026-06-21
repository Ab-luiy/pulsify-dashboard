---
type: playbook
tags: [delivery, sop, onboarding, client, pulse-system]
sources: [[wiki/concepts/pulse-system-mechanism]], [[wiki/playbooks/pulsify-offer-v1]]
created: 2026-05-10
updated: 2026-05-10
---

# Pulsify delivery SOP

The week-by-week protocol for delivering a paid Pulse System engagement. From the moment the contract is signed to the day-90 review and beyond. Designed to be runnable by the founder + agent with no other humans, and survivable across exam weeks.

## Why this matters for Pulsify

The offer ([[playbooks/pulsify-offer-v1]]) defines what the client buys. The mechanism ([[concepts/pulse-system-mechanism]]) defines what gets installed. This SOP defines *what happens, in what order, by whom*. Without it, the founder reinvents the engagement for every new client and quality drops with each addition.

This SOP also doubles as a sales artifact — showing a prospect this page on a call is itself a close.

## Pre-engagement

The moment a contract is signed:

1. **Payment received.** Crypto into Binance Turkey or SWIFT bank transfer. Base PIF or first 50% of base.
2. **Workspace created.** Slack workspace (preferred) or Discord server, whichever the client uses. Channels: `#general`, `#content`, `#funnel`, `#sales`, `#agent-queue`, `#metrics`, `#urgent`.
3. **Notion shared workspace.** One top-level page per client at `clients/{name}/` linked to the Pulsify vault. Sub-pages: overview, content pipeline, calls, progress, decisions.
4. **Game-plan call scheduled.** 60 minutes, within 72 hours of payment. Founder + client only.
5. **Welcome email queued.** Drafted by agent. Includes: link to workspace, link to Notion, list of credentials Pulsify needs (see Week 1).

## Week 1 — diagnose and integrate

The week that decides whether the engagement succeeds. Skip nothing here.

**Game-plan call (Day 1, 60 min).** Founder + client. Recorded. Topics in this order:
- 5 min: re-confirm the contract terms and the $100k guarantee out loud.
- 15 min: client's current state — revenue, audience, offer, team, content cadence, current funnel.
- 15 min: client's working theory of why they're stuck. Pulsify listens; does not fix yet.
- 15 min: Pulsify's diagnosis. Names the bottleneck explicitly.
- 10 min: agreed first-week deliverables, from the client side: credentials list, payment-processor access, calendar share, content archive.

**Recording.** The call is transcribed and dumped into `clients/{name}/calls/week-1-game-plan.md`. The agent extracts: every decision, every pain point, every coach-specific phrase to feed the Brand Brain.

**Credentials handover (by Day 3):**
- IG account (admin or scheduling access via Meta Business Suite).
- YouTube channel (Studio access).
- Email provider.
- CRM (or empty Notion if none).
- Payment processor read access (Stripe / bank export view / equivalent).
- Calendar booking tool.

If any of these are missing or refused, escalate same-day. Refusal of payment-processor access voids the engagement per [[playbooks/pulsify-offer-v1]].

**Brand Brain intake interview (Day 4–5, 90 min).** Founder + client. Structured questionnaire — see future page `wiki/playbooks/brand-brain-intake.md` (pending). Captures: voice samples, positioning history, audience psychographics, offer mechanics, unique mechanism candidates, past content that worked, past content that flopped.

**Week 1 deliverable to client (Day 7):**
- Diagnosis doc — one page, names the three biggest bottlenecks and the order Pulsify will attack them.
- Workspace fully populated.
- First content angles drafted by agent (10 angles, ranked).
- Day-90 success metric written into the contract addendum: target = $100,000 attributable revenue. The number is fixed by the offer.

## Week 2 — Brand Brain and profile renovation

**Owned by:** founder.

- Brand Brain populated inside the client's own Claude project. Knowledge base: voice samples, mechanism, offer details, past content performance, competitor set.
- IG profile renovation: bio rewritten, highlights rebuilt per [[concepts/profile-funnel]] structure (start here / results / mechanism / demo / testimonials / apply).
- Unique mechanism named. Co-decided with the client on a 30-min call. No mechanism, no engagement past Week 2.
- Profile audit doc shipped: before/after IG, before/after YouTube channel art, before/after bio.

## Week 3 — Content Engine v1

**Owned by:** founder + agent.

- Research subroutine running: top 30 niche channels scanned weekly, angles tagged and scored.
- First three video angles approved by founder, scripts drafted by agent, scripts approved by client.
- Title and thumbnail concepts pulled from validated patterns per [[content-engine/packaging-rules]] and [[content-engine/content-pillars]].
- Shoot schedule locked for the next 4 weeks.

## Week 4 — first content shipped

**Owned by:** client (shoot) + founder (everything else).

- First 2 long-form videos shot.
- Thumbnails finalized.
- Videos scheduled for staggered release.
- Description CTA wired to IG → VSL.

If the client cannot shoot in Week 4, this is a leading indicator of execution failure. Founder addresses on a call before Week 5 starts.

## Week 5 — Funnel Stack live

**Owned by:** founder.

- Client's VSL drafted and recorded (founder produces script, client records, founder edits or contracts editor).
- Typeform built using the same 7–10 question structure as Pulsify's own (see [[playbooks/pulsify-funnel-v1]]) tuned to the client's offer.
- Cal.com or equivalent wired to Typeform.
- Pre-call email sequence built.
- IG link-in-bio swapped to the new VSL URL.
- 50% of base payment due if on split.

## Weeks 6–8 — Sales Co-pilot

**Owned by:** founder + agent.

- Pre-call brief subroutine running for every booking.
- Proposal templates drafted in the client's voice for their pricing tiers.
- CRM auto-update wired (Cal.com webhook → CRM stage transitions).
- If client has setters/closers: onboarded into Slack, weekly metric reports start.
- If client runs sales themselves: founder coaches on the first 3 calls (silent observer, then debrief).

## Weeks 9–11 — Ops Replacement and optimization

**Owned by:** agent (with founder review).

- Comment triage running on every published video and post, drafted replies queued for client approval.
- DM triage running on IG.
- Daily dashboard refresh.
- Weekly metric report posted to Slack every Monday.
- Founder runs an optimization pass: which video archetype is producing, which is dead; which thumbnail style is converting; which Typeform question has the highest fail rate.

## Week 12 — day-90 review

**Owned by:** founder + client.

60-min call. Recorded. Filed at `clients/{name}/calls/week-12-review.md`.

- Measure attributable revenue from the integrated payment processor view.
- Compare against the $100k guarantee.
- **If hit:** celebrate, collect testimonial, schedule case-study production, propose continuation terms (renewal at full base + same performance share, or transition to performance-only at the founder's discretion).
- **If missed:** continuation triggers per the offer page. No additional base. Performance fee continues. Engagement runs until target is hit. The week-12 call sets the new immediate-priority list and new weekly cadence.

## Continuation phase (if triggered)

**Owned by:** founder + agent at reduced cadence.

- Weekly call drops to bi-weekly unless client requests otherwise.
- Async deliverables continue: agent runs all subroutines on the same schedule.
- Founder operator hours tracked (transparency, not a cap — see [[playbooks/pulsify-offer-v1]] open-questions section for the recorded risk on the no-cap structure).
- Monthly review: where are we vs. $100k, what's the leak, what's the fix.
- Continuation ends the day attributable revenue crosses $100,000. Case-study assets collected at that moment.

## Off-boarding

When the engagement closes (success or mutual exit):

- Client retains: their Brand Brain, their custom agent, the funnel, the Typeform, the Cal.com setup, all SOPs Pulsify built, the dashboard.
- Pulsify retains: templates, frameworks, prompt packs, Pulse System methodology IP, case-study rights.
- Final 30-min call: hand-off walkthrough, what to maintain, what to retire if not maintaining. Recording filed.
- Final email: links, credentials returned, performance-fee final settlement schedule.
- Case study filed at `wiki/synthesis/case-{client-name}.md` — angle, before/after, what worked, what didn't, transferable lessons.

## During exam weeks (founder offline)

Per [[playbooks/exam-mode-autonomous-ops]]:

- Weekly calls postponed; agent drafts async update from the dashboard.
- All client-facing messages drafted by the agent and queued for founder approval before sending.
- Decision queue check by founder daily, even during exams (10 minutes max).
- Client briefed at engagement start: "during these dates, async only, the system continues running."

## Tools per client

| Tool | Purpose |
|---|---|
| Slack or Discord | day-to-day comms |
| Notion (shared) | living document of everything |
| WhatsApp | urgent only |
| Loom | weekly async updates from founder |
| Google Drive | file exchange |
| Cal.com | sales calls |
| Typeform | qualification |
| Wistia / VSL host | VSL hosting and analytics |
| Stripe / payment processor | revenue source of truth |
| Claude project | the client's Brand Brain and agent |

## Connections

- [[concepts/pulse-system-mechanism]] — what gets delivered.
- [[playbooks/pulsify-offer-v1]] — the contract this SOP fulfills.
- [[playbooks/pulsify-funnel-v1]] — the funnel architecture installed for each client (mirrors Pulsify's own).
- [[playbooks/exam-mode-autonomous-ops]] — protocol when founder is offline.
- [[clients/nick/overview]] — the prior engagement that informed the Week 1 integration discipline.
- [[concepts/pulsify-order-of-operations]] — the broader 16-step sequence; this SOP is the practical week-by-week version.

## Open questions / gaps

- `wiki/playbooks/brand-brain-intake.md` not yet written. Becomes a priority once the first paid v1 client signs.
- `wiki/playbooks/pulse-system-stack.md` (the technical stack: which Make/n8n flows, which webhooks, which Claude project structure) not yet written.
- Off-boarding template emails and final-call agenda not yet drafted.

## Source trail

- Founder voice notes, 2026-05-10.
- [[concepts/pulse-system-mechanism]], [[playbooks/pulsify-offer-v1]].
- [[clients/nick/overview]] — execution-cadence lessons.
