---
type: framework
tags: [vsl, funnel, conversion, email, landing-page, jeremy-haynes]
sources: [[raw-sources/frameworks/VSL-Frameworks-Jeremy-Haynes.md]]
created: 2026-05-02
updated: 2026-05-02
---

# VSL framework

The VSL framework is Jeremy Haynes' system for structuring a video sales letter, the landing page it lives on, and the pre-call email sequence that runs after booking. Used together, these three components form the core infrastructure of a call funnel — moving a cold visitor from first click to booked call to show.

## Why this matters for Pulsify

The VSL is step 9 in [[pulsify-order-of-operations]], the upgrade from the [[profile-funnel]] when a client's audience and offer warrant it. It is the conversion engine that makes paid traffic viable — a VSL that converts at 30%+ on cold traffic changes the entire economics of scaling. A VSL that converts at 5% burns budget with no path to ROI.

Pulsify does not build VSLs for every client from day one. The VSL requires a finalized [[unique-mechanism]], a proven offer, and enough sales call data to write the script from real objection and question data.

## Core mechanics

### The 6-step VSL structure

Jeremy's VSL framework follows a fixed six-step flow. Every element earns its place or gets cut.

**Step 1: Hook**
The first 30–60 seconds. States the specific result, the specific avatar, and the specific mechanism — in that order. Does not introduce the speaker's credentials first. Does not build up to the point.

Failing hook: "Hi, I'm [name]. I've been in this space for 8 years. Today I want to share with you..."
Working hook: "If you're a dropshipping operator doing $10–$30K/month and you keep hitting the same ceiling, the next 12 minutes are going to show you exactly why — and what the operators who break through it are doing differently."

**Step 2: Problem identification**
Name the exact pain the avatar is experiencing. Not a generic version of the pain — the specific frustration, the specific failed attempt, the specific belief that is holding them back. This section functions as a mirror: the viewer sees their situation described with more precision than they could have articulated themselves.

**Step 3: Mechanism reveal**
Introduce the unique mechanism as the explanation for why prior attempts failed and why this approach is different. The mechanism is not presented as "my program" — it is presented as a logical framework that produces a specific result. The viewer evaluates the logic, not the claim.

**Step 4: Proof stack**
Client results, case studies, before/after transformations. Each proof piece is:
- From original source (video, screenshot, email) — never retyped
- Specific (names, numbers, timeframes where possible)
- In the client's own words, not paraphrased

Order: transformation first, backstory second. If the viewer has to watch 5 minutes to get to the result, the proof stack has failed.

**Step 5: Offer reveal**
State what the viewer gets, how it works, who it is for, and what it costs. The offer reveal is not a soft mention — it is direct and complete. Viewers who have reached step 5 are warm enough to hear the price. Do not hide it.

**Step 6: Call to action**
One clear action. Not multiple options. The CTA sends the viewer to a Typeform qualification form, not directly to a calendar. Filtering happens at the form level so only qualified leads reach the calendar booking step.

### The affluent vs. general public distinction

The VSL structure shifts based on the financial profile of the target prospect:

**General public (under $5K/month earners):**
- Longer proof stack required (more skepticism, more need for social proof)
- More emotional language around transformation
- Lower price points, clearer ROI framing
- Simpler mechanism explanation

**Affluent prospects ($10K+/month earners, Marcus-stage and above):**
- Proof stack can be compressed — they have seen claims before and are more interested in the logic
- Authority and specificity matter more than volume of testimonials
- Mechanism depth is more important than emotional framing
- Price is less of a barrier; quality of fit and clarity of mechanism are the filters

Most Pulsify clients serve affluent-adjacent prospects (coaches, operators, creators). VSL scripts for these audiences front-load mechanism clarity and compress the proof stack relative to B2C VSL conventions.

### Typeform + Calendly: the only acceptable tech stack

Jeremy's specification: the call booking flow must use Typeform (or equivalent survey tool) before Calendly. Not Calendly alone. The reason:

- Direct Calendly links allow unqualified prospects to book calls with no friction
- Inserting a qualification form eliminates 40–50% of the unqualified applications before they reach the calendar
- Leads who complete the form are higher intent (they invested time) and more qualified (they answered qualifying questions)
- The data from form responses gives the closer pre-call intelligence

The consequence of skipping this step: closers spend 30–50% of their calls on people who cannot afford the offer, are not in the right niche, or have no genuine intent to move forward.

**Typeform fields (minimum required):**
- What is your current monthly revenue?
- What specific problem are you trying to solve?
- What have you already tried?
- What would success look like in 90 days?
- Are you in a financial position to invest $X–$Y in a solution today?

The financial qualification question is non-negotiable. Without it, the disposition tracker fills up with NQ calls.

### CAPI (Conversion API) integration

For clients running paid ads, CAPI is the mechanism for sending conversion data directly from the server to the ad platform — bypassing browser-based pixel limitations (iOS 14+ blocking, ad blockers, cross-device gaps).

Critical rule: **never send disqualified lead data to CAPI.** If a visitor reaches the disqualification page (form completed but DQ'd), that event must not fire to the pixel. Sending DQ page data teaches the ad algorithm to find more people like the people who got disqualified — the opposite of the intended outcome.

Only two events should fire to CAPI:
1. Qualified application submission (passed the form)
2. Booked call (calendly booking confirmed)

### Landing page structure

The landing page wraps the VSL and qualifies traffic before the form:

1. **Headline** — specific, avatar-targeted, mechanism-referenced. Not generic.
2. **VSL** — hosted on Wistia (preferred) for resume-play functionality and analytics
3. **Sub-headline or bullet points** — 3–5 points restating the core promise in specific terms
4. **CTA button** → Typeform → Calendly
5. **Testimonial stack** (below CTA) — original source, transformation-first format
6. **FAQ section** (optional) — pulls from the same quadrants as [[hammer-them-strategy]] content

Page length depends on audience size (see [[micro-niche-youtube]] landing page table). Micro niche audience = headline + Calendly. Larger audiences = full stack.

### Post-booking: confirmation page and email sequence

After the call is booked, two things run simultaneously:

**Confirmation page:**
A research hub, not a receipt screen. Contains:
- Short framing video (2–3 minutes): "Our goal is for you to be fully in or out before we even talk"
- 4–12 breakout videos (30 seconds to 5 minutes each) from the four hammer them quadrants
- Original-source testimonials
- FAQ document or link

**Email sequence:**
- 6 emails per day for 48–72 hours
- Content from the four quadrants (questions, objections, expectations, follow-up questions)
- Not reminders — framing, education, proof
- Target open rate when content is relevant: 50–80% per email

See [[hammer-them-strategy]] for the full pre-call sequence mechanics.

## How Pulsify uses this

The VSL framework is a step-9 decision in [[pulsify-order-of-operations]]. Pulsify builds it only when:
1. The unique mechanism is locked and named
2. The offer is proven (at least 3–5 paying clients through organic channels)
3. Sales call data exists to source real questions and objections for the script
4. The client has either existing audience traffic or ad budget to drive traffic to the page

At early stages, Pulsify replaces the full VSL framework with the Profile Funnel (step 5) — a lower-cost infrastructure that does most of the same qualification work over a longer timeline.

## Connections

- [[hammer-them-strategy]] — the post-booking sequence that runs alongside and after the VSL
- [[call-funnel-framework]] — the math and KPI system the VSL feeds into
- [[profile-funnel]] — the pre-VSL conversion mechanism for earlier-stage clients
- [[pulsify-order-of-operations]] — step 9 where the VSL is built
- [[unique-mechanism]] — the core message the VSL is built around
- [[webinar-framework]] — an alternative architecture when audience and budget support it
- [[jeremy-haynes]] — source of this framework

## Open questions / gaps

- The Wistia recommendation (for resume-play and video analytics) is from Jeremy's framework but Pulsify has not documented its own preferred hosting choice. Wistia has cost implications for early-stage clients.
- CAPI implementation requires developer work or Zapier/Make automation. The specific technical setup is not documented in raw-sources. Needs to be built as a technical SOP.

## Source trail

- [[raw-sources/frameworks/VSL-Frameworks-Jeremy-Haynes.md]]
