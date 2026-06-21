---
type: prompt
category: delivery / funnel-stack
use: Builds the full hammer-them pre-call email sequence (12-18 emails over 48-72h) plus the confirmation-page breakout video list
workflow: Sales-call quadrant data + proof assets + offer in -> scheduled email sequence out
created: 2026-06-09
---

# Pre-call email sequence prompt

The window between booking and call is the highest-leverage 48-72 hours in the funnel. [[wiki/concepts/hammer-them-strategy]] specifies 6 emails per day in that window, built from four quadrants of real sales-call data, producing 60-70%+ show rates when done at full volume. This prompt builds the whole sequence in one run, for Pulsify's own funnel or any client's.

Half volume produces no measurable result — Jeremy's framework is explicit on this. If you only have data for 6 emails, get more data before shipping the sequence.

## Workflow

1. Collect quadrant data: common questions, common objections, expectations, follow-up questions. Source from real sales calls. If no calls exist yet, mine audience comments and DMs and label the sequence v0 — replace it after the first 5 real calls.
2. Inventory proof and content assets: testimonials with sources, breakout videos that exist or can be shot in a day, FAQ material.
3. Run. Review every subject line yourself — subject lines decide the 50-80% open rate target.
4. Load into the email tool with the send schedule as specified. Calls should be booked 2-3 days out so the window exists.

---

## The prompt

You are building a pre-call email sequence for a high-ticket coaching funnel. The lead has booked a sales call 48-72 hours from now. The job of these emails is framing, education, and objection handling — moving the lead up interest levels before the call so the close feels like order-taking. These are not reminders. A reminder sequence gets ignored; this sequence gets 50-80% opens because every email answers something the lead is actually wondering.

**Business:**
- Coach/company: [name]
- Offer: [what's sold, price range, format]
- Unique mechanism: [the named mechanism]
- Avatar: [who books these calls]

**Quadrant data (from real sales calls — the raw material for every email):**
- Common questions at call start: [list]
- Common objections when the offer lands: [list]
- Expectations leads need set to succeed: [list]
- Follow-up questions after the first answers: [list]

**Proof inventory:**
[Testimonials and case studies with original sources. Verified-source only.]

**Existing assets:**
[Breakout videos, FAQ docs, research SOPs already produced — emails should link these, not duplicate them.]

**Window:** [48h (12 emails) / 72h (18 emails)]

---

Produce the sequence as a table first, then every email in full.

**The table:** email number, send time (hours after booking), quadrant it serves, subject line, one-line job description.

Distribution rules for the table:
- Every quadrant gets covered. Objections get the most slots — they're what kills closes.
- First email sends within 15 minutes of booking: sets the frame ("our goal is for you to be fully in or out before we talk"), links the confirmation page.
- Last email sends 2-4 hours before the call: the shortest one, restates what the call is and isn't.
- Proof emails alternate with education emails. Never two proof emails back to back.

**Each email in full:**
- Subject line: curiosity from the lead's own question, never clickbait. A lead should open it because it names something they were already wondering.
- Body: 50-150 words. One idea per email. Short paragraphs, spoken tone, in the coach's voice.
- Each email ends with either a link to one asset or one reframe. No CTA stacking — the only goal is show up informed.

**Then output the confirmation-page breakout list:** 4-12 videos, 30 seconds to 5 minutes each, mapped to the same quadrants, each with a working title and a 2-line content note so they can be shot in one session. The emails and the page carry the same material in two formats.

## Rules

- Every email traces to a quadrant item. An email that answers a question nobody asked is filler and gets cut.
- Use the lead's language from the quadrant data, not marketing language about it.
- Testimonials keep their original source framing. Never retype a result into prose.
- If the quadrant data can't fill the window at one-idea-per-email, output fewer emails and flag the gap — never pad.

## Voice guard

Before outputting anything, run this pass on the draft and fix every hit:

1. "It's not X, it's Y" negative parallelism — maximum one per piece, zero in DMs.
2. More than three em dashes — convert the rest to commas or periods.
3. "Here's the thing / here's the kicker / let's break this down" — cut.
4. "Serves as / represents / stands as" — replace with "is."
5. Bold-lead bullets in copy a person reads as writing — unbold.
6. Curly quotes or arrow glyphs — replace with straight quotes and "->".
7. Rule-of-three stacked more than once — vary the count.
8. "It's worth noting / importantly / notably" filler — delete.
9. "Delve / leverage / utilize / robust / seamless / streamline / harness" — replace with plain words.

Hard rules on top of the scan: no emojis, no exclamation marks, no lifestyle flexing, never invent a stat, a result, or a person's background. If a claim has no source in the inputs, cut the claim or flag it as unverified.
