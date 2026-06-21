---
type: playbook
tags: [delivery, onboarding, brand-brain, pulse-system, client]
sources: [[wiki/playbooks/pulsify-delivery-sop]], [[wiki/concepts/pulse-system-mechanism]], [[wiki/frameworks/vsl-framework]]
created: 2026-06-09
updated: 2026-06-09
---

# Brand Brain intake

The structured interview and build protocol that populates a client's Brand Brain in Week 1 of delivery. [[playbooks/pulsify-delivery-sop]] schedules this as a 90-minute call on Day 4-5 and marked the page as pending; this is that page. The Brand Brain is component 1 of [[concepts/pulse-system-mechanism]] — every other component reads from it, so a thin intake degrades everything downstream: scripts sound generic, briefs miss context, the VSL doesn't sound like the coach.

## Why this matters for Pulsify

The Brand Brain is what makes "in the client's voice" real instead of a sales line. It is also the client's strongest retention anchor — they keep it forever, they can query it directly, and no competitor deliverable resembles it. The intake is the one chance to capture the raw material while the client is most engaged (Week 1, just paid, motivated). Re-extracting this in Week 6 from a busy client never happens.

## What feeds the Brand Brain (collect before the call)

The interview covers what only the client knows. Everything extractable without them gets collected first, so call time isn't wasted on facts:

- Transcripts of their 10 most-viewed videos and 5 most recent (voice and teaching-style data).
- Their funnel as it exists: every page, screenshot every step.
- Last 30 IG posts and stories highlights structure.
- Any past sales call recordings they can export (objection data — the four quadrants in [[concepts/hammer-them-strategy]] start here).
- Payment processor export (revenue shape: price points, refund rate, seasonality).
- The game-plan call transcript from Day 1.

Run [[raw-sources/prompts/prospect-profile-synthesis-prompt]] over the scraped material before the interview. The interview then verifies and deepens rather than discovers from zero.

## The interview — 90 minutes, recorded, founder + client

Seven sections. Times are guides, not walls. The recording gets transcribed into `clients/{name}/calls/brand-brain-intake.md` and mined the same day.

### 1. Origin and authority anchors (10 min)

- How did you get into [niche], and what was the moment you knew you could teach it?
- What results of your own can you prove with documents or screenshots? (Only provable claims enter the Brand Brain as proof; the rest is story.)
- What do students say you explain better than anyone else they've learned from?

### 2. Voice calibration (15 min)

- Which of your own videos sounds most like you on your best day? What makes it that one?
- What phrases do you say constantly? What words would you never use?
- Who in the space do you sound nothing like and want to stay away from?
- Read-back test: read them two paragraphs from the synthesized profile and ask "would you say this?" Note every correction verbatim — corrections are the highest-value voice data in the call.

### 3. Audience psychographics (15 min)

- Describe your last 3 students who got results: where were they when they found you, what had they tried, what changed.
- Describe the last 3 who didn't: what was different.
- What do people in your DMs ask over and over? What do they get wrong about [niche]?
- What does your audience believe that's holding them back? (This becomes problem-identification material for the VSL per [[frameworks/vsl-framework]] step 2.)

### 4. Offer mechanics (15 min)

- Walk me through what a student gets, week by week, from payment to result.
- What's the real transformation — not the deliverables, the before and after state?
- Price history: what have you charged, what happened at each price?
- Refunds and complaints: what triggers them?

### 5. Unique mechanism candidates (15 min)

The mechanism gets named in Week 2 on a separate 30-minute call, but the raw material comes from here:

- What do you do differently from every other [niche] coach, in method, not in effort or care?
- If a student followed only one of your rules, which one moves the result most?
- What's your unpopular opinion about how [niche] should be taught or traded/run?
- Listen for a repeatable, nameable process. Capture 2-4 candidates with the client's own wording. Do not name the mechanism on this call — premature naming anchors badly.

### 6. Content history (10 min)

- Which videos or posts brought actual customers, as far as you can tell? Which brought views but nothing else?
- What content do you hate making? (Cadence dies where dread lives — the Content Engine plans around it.)
- What have you always wanted to make but haven't? Why not?

### 7. Constraints and red lines (10 min)

- Topics, claims, or styles that are off-limits (compliance, platform risk, personal).
- Existing commitments: editors, VAs, agencies still under contract.
- Realistic weekly hours for shooting and approvals. Get a number, not "whatever it takes."
- Who else touches the accounts and channels Pulsify is taking over.

## The build — same week, founder-owned

1. Transcribe the interview, mine it against the seven sections, merge with the pre-collected material.
2. Create the client's Claude project. Knowledge base files, one per concern: `voice.md` (verbatim phrases, corrections from the read-back test, never-say list), `audience.md`, `offer.md`, `mechanism-candidates.md`, `proof-inventory.md` (each item tagged verified-source or claim), `content-history.md`, `constraints.md`.
3. Project instructions for the client's agent: who the client is, the voice rules, the red lines from section 7, and the same voice-guard pass used in [[raw-sources/prompts/_voice-guard]].
4. Acceptance test before sign-off: generate three artifacts through the Brand Brain — a DM reply to a common question, a 60-second script intro, an objection response. Founder checks them against the voice data. If they would not fool the client's own audience, the intake has gaps; book a 20-minute follow-up rather than shipping thin.
5. Founder approval gate per [[concepts/pulse-system-mechanism]]: no other component goes live until the Brand Brain passes.

## Output checklist (Week 1 exit criteria)

- Interview recorded, transcribed, filed.
- Seven knowledge files populated in the client's Claude project.
- Proof inventory tagged verified vs claim.
- 2-4 mechanism candidates captured for the Week 2 naming call.
- Acceptance test passed and noted in `clients/{name}/decisions.md`.

## Connections

- [[playbooks/pulsify-delivery-sop]] — schedules this in Week 1.
- [[concepts/pulse-system-mechanism]] — the Brand Brain is component 1; this is its build spec.
- [[concepts/unique-mechanism]] — Week 2 naming call consumes section 5's candidates.
- [[concepts/hammer-them-strategy]] — quadrant data collection starts with the past-calls export.
- [[raw-sources/prompts/prospect-profile-synthesis-prompt]] — pre-interview synthesis step.
- [[playbooks/pulsify-contract-template-v1]] — credentials and access this intake assumes are already granted.

## Open questions / gaps

- Untested against a real paid client. First v1 engagement will reshape timings and probably kill or merge questions. Treat the seven-section structure as fixed and the question lists as drafts.
- Whether the client's Brand Brain lives in their Claude account or Pulsify's (with handover at off-boarding) is undecided — contract and access implications either way.

## Source trail

- [[playbooks/pulsify-delivery-sop]] — the Week 1 slot and the pending-page reference.
- [[concepts/pulse-system-mechanism]] — Brand Brain definition and checkpoint rule.
- [[frameworks/vsl-framework]], [[concepts/hammer-them-strategy]] — downstream consumers that dictate what the intake must capture.
