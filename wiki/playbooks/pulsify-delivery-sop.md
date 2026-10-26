---
type: playbook
tags: [delivery, sop, onboarding, client, pulse-system]
sources: [[wiki/concepts/pulse-system-mechanism]], [[wiki/playbooks/pulsify-offer-v1]]
created: 2026-05-10
updated: 2026-10-26
---

# Pulsify delivery SOP

The week-by-week protocol for delivering a paid engagement, from the moment the contract is signed for as long as it runs. Designed to be runnable by the founder + agent with no other humans, and survivable across exam weeks.

> **Terms updated 2026-10-26.** The engagement has no end date and no revenue guarantee. It runs until either side stops it, and the guarantee is the delivery guarantee in [[playbooks/pulsify-offer-v1]]. The old $100k-in-90-days target, day-90 review and continuation phase are removed below. Much of the Slack/Notion tooling here has since moved into the Pulsify app (portal, onboarding v2, booked pipeline); this page has not been re-audited for that yet.

## Why this matters for Pulsify

The offer ([[playbooks/pulsify-offer-v1]]) defines what the client buys. The mechanism ([[concepts/pulse-system-mechanism]]) defines what gets installed. This SOP defines *what happens, in what order, by whom*. Without it, the founder reinvents the engagement for every new client and quality drops with each addition.

This SOP also doubles as a sales artifact — showing a prospect this page on a call is itself a close.

## Pre-engagement

The moment a contract is signed:

1. **Payment received.** The setup fee ($5,000 by default) in crypto (USDT/USDC) or by bank transfer. Recorded under Income, which issues the receipt.
2. **Workspace created.** Slack workspace (preferred) or Discord server, whichever the client uses. Channels: `#general`, `#content`, `#funnel`, `#sales`, `#agent-queue`, `#metrics`, `#urgent`.
3. **Notion shared workspace.** One top-level page per client at `clients/{name}/` linked to the Pulsify vault. Sub-pages: overview, content pipeline, calls, progress, decisions.
4. **Game-plan call scheduled.** 60 minutes, within 72 hours of payment. Founder + client only.
5. **Welcome email queued.** Drafted by agent. Includes: link to workspace, link to Notion, list of credentials Pulsify needs (see Week 1).

## Week 1 — diagnose and integrate

The week that decides whether the engagement succeeds. Skip nothing here.

**Game-plan call (Day 1, 60 min).** Founder + client. Recorded. Topics in this order:
- 5 min: re-confirm the contract terms out loud: the 30% share, the starting monthly revenue in the contract, and the delivery guarantee.
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

If any of these are missing or refused, escalate same-day. Without payment-processor access the app can't track the money the 30% is based on.

**Brand Brain intake interview (Day 4–5, 90 min).** Founder + client. Structured questionnaire — [[playbooks/brand-brain-intake]]. Captures: voice samples, positioning history, audience psychographics, offer mechanics, unique mechanism candidates, past content that worked, past content that flopped.

**Week 1 deliverable to client (Day 7):**
- Diagnosis doc — one page, names the three biggest bottlenecks and the order Pulsify will attack them.
- Workspace fully populated.
- First content angles drafted by agent (10 angles, ranked).
- Starting monthly revenue checked against the onboarding money answers and the number in the contract.

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

## Monthly review (from month 3)

**Owned by:** founder + client.

60-min call. Recorded. Filed at `clients/{name}/calls/`.

- Revenue collected since signing, from the app's tracking and the payment-processor export, against the starting monthly revenue in the contract.
- Which video archetype is producing and which is dead; where the funnel leaks; what changes next month.
- When there is a clear result: collect the testimonial and schedule case-study production.

There is no day-90 cut-off and no continuation phase. The engagement keeps running until either side stops it (see [[playbooks/pulsify-offer-v1]]).

## Off-boarding

When either side stops the engagement:

- Client retains: their Brand Brain, their custom agent, the funnel, the Typeform, the Cal.com setup, all SOPs Pulsify built, the dashboard.
- Pulsify retains: templates, frameworks, prompt packs, Pulse System methodology IP, case-study rights.
- Final 30-min call: hand-off walkthrough, what to maintain, what to retire if not maintaining. Recording filed.
- Final email: links, credentials returned, and the 30-day tail: deals already in progress that close within 30 days still pay the share.
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
| Cal.com (free) or Calendly (paid) | sales calls — both approved (founder decision 2026-07-03): Cal.com is the free default, Calendly the paid option; client's choice |
| Typeform | qualification |
| Wistia / VSL host | VSL hosting and analytics |
| Stripe / payment processor | revenue source of truth |
| Claude project | the client's Brand Brain and agent |

## Call-to-SOP rule (added 2026-09-29)

From Dustin Varano ([[synthesis/dustin-varano-the-keys]]): any question answered on a client call that no existing SOP or playbook covers becomes one the same day. Pull the transcript (Fathom), extract each question and the answer actually given, write one standalone page per topic in the vault format, and fill only obvious gaps without inventing. Plus a weekly pass across all calls. This is the vault's own ingest habit applied to delivery calls.

## Connections

- [[concepts/pulse-system-mechanism]] — what gets delivered.
- [[playbooks/pulsify-offer-v1]] — the contract this SOP fulfills.
- [[playbooks/pulsify-funnel-v1]] — the funnel architecture installed for each client (mirrors Pulsify's own).
- [[playbooks/exam-mode-autonomous-ops]] — protocol when founder is offline.
- [[clients/nick/overview]] — the prior engagement that informed the Week 1 integration discipline.
- [[concepts/pulsify-order-of-operations]] — the broader 16-step sequence; this SOP is the practical week-by-week version.

## Open questions / gaps

- Off-boarding template emails and final-call agenda not yet drafted.
- *(Resolved 2026-07-03: [[playbooks/brand-brain-intake]] and [[playbooks/pulse-system-stack]] both exist since 2026-06-09 — earlier "not yet written" claims here were stale, fixed per lint L5.)*

## Source trail

- Founder voice notes, 2026-05-10.
- [[concepts/pulse-system-mechanism]], [[playbooks/pulsify-offer-v1]].
- [[clients/nick/overview]] — execution-cadence lessons.
