---
name: story-sequence-generator
description: Generate complete Instagram story sequences (slide-by-slide copy + photo direction) using the Niksetting method in the Pulsify vault. Use whenever the founder asks for a story sequence, story slides, a start-here, a story launch, or says things like "make me a credibility sequence about X" or "I want to talk about a case study in my stories" - for Pulsify's own profile OR any client. Do NOT generate story sequences from memory; this skill carries the validated frameworks, the founder-ratified doctrine, and the photo-request flow.
---

# Story sequence generator

You generate production-ready story sequences: the founder (or a client) picks a type or just says what they want to talk about; you shape it into the right sequence type, request the specific photos needed with concrete recommendations, and write the slide-by-slide copy.

## Load before generating

1. `wiki/frameworks/story-sequence-system.md` — the system (types, 6-step structure, 9-slide frame, cadence, CTA dial).
2. `wiki/content-engine/sequence-breakdowns/niksetting-new-here.md` — the reference for slide texture, emphasis grammar, and the lesson template.
3. `wiki/content-engine/copy-voice-guide.md` — the voice guard; run its checks on every slide you write.
4. For clients: their `clients/{name}/overview.md` or creator profile — their niche, mechanism, proof inventory, trigger word.

## Step 1 — intake

If the user named a type, use it. If they described an intent ("a case study and how it relates to viewers", "how I never imagined getting here"), map it yourself and confirm in one line. The type menu (Niksetting's own seven, from his corpus + captured caption):

1. **Value-driven** — a story containing something genuinely useful; scene -> tension -> framework/lesson. Shows the level of thinking.
2. **Credibility** — result stacking: open with a result, wins across the board, close with a positioning statement. (A "case study" intent usually lands here or in breakdown.)
3. **Q&A** — question box; answer ~12h later; 50/50 technical/personal; write your own questions if too few arrive.
4. **Day-in-the-life** — timestamped founder day; every slot carries value, education, or proof.
5. **Breakdown** — teach one ICP topic step by step (educational; old way / new way frames).
6. **Lifestyle** — the 20% human share; personal bonding. (For Pulsify: humanity without flex — see currency rule.)
7. **CTA** — the conversion sequence; the 9-slide frame below.

Per-type deployment (from the captured 964k carousel matrix — guide cadence and audience fit): value-driven 1-2x/week (demonstrates expertise, all niches); credibility 2-3x/week (instills trust, saturated niches); Q&A 1x/week (removes friction, skeptical audiences); day-in-the-life 1-2x/month (creates familiarity, B2C); breakdown 1x/week (justifies pricing, DWY/DFY offers); lifestyle 1-2x/week (creates desire - Pulsify serves this with mission/transformation, never possessions); CTA under 1x/month (tests demand - over-asking burns the audience).
Plus the permanent assets: **start-here** (the 18-slide deployed architecture with the lesson template — the highlight's NAME is free per founder ruling: "start here," "new here?", or anything that fits the account; likewise proof highlights may be named "clients," "student wins," "results," and there can be several) and **story launch** (the ~9-slide stories webinar; only for accounts with accumulated sequence data).

Then collect (ask only what's missing, in ONE message): who this is for (Pulsify or which client); the topic/angle in their words; the goal (reach vs DMs vs booked calls -> sets CTA placement); the trigger word if a hard CTA is wanted; available proof (results, receipts, screenshots — never invent any number or result); slide count preference (default 7-9).

## Step 2 — request the photos (before or with the copy)

For every slide, specify the photo needed as a concrete, shootable request: shot type + setting + mood, with 1-2 realistic alternatives. Follow the captured visual grammar (wide frames where the environment argues, close-ups for authority moments, a warm register-drop at the close) but ALWAYS in Pulsify proof currency — founder-ratified: real workspaces, screen receipts, client dashboards, whiteboards/Miro, team calls, gym/walk humanity shots. Never cars, watches, hotels, cash. Phone-raw beats polished (ratified dial 4).

Example of the expected specificity: "Slide 3 (proof): screenshot of the client's Stripe/analytics dashboard, actual numbers visible, cropped to the chart — phone screenshot is fine. Alternative: the WhatsApp message where they told you the result, name blurred."

If the user already has photos, ask them to list/drop what they have and fit the sequence to the inventory rather than demanding reshoots.

## Step 3 — generate

Every sequence walks the universal 6 steps: curiosity -> pain (call out the pain, not the situation) -> statement+proof -> belief shift (one reframe, driven deep) -> result -> close from abundance.

For conversion-goal sequences use the 9-slide frame: 1-3 pattern interrupt + proof/value thread; 4-6 pain mirror + the gap; 7-9 access, offer, CTA. Slides 1-6 are pure value — no pitch before slide 7. CTA dial (ratified): volume goal (lead magnet) = CTA on slide 1; qualification goal = CTA at the end. Engineered CTAs are primary doctrine — a soft CTA (lead magnet/long form) and/or a hard CTA (DM trigger word); never omit the ask on a conversion sequence.

Output format — one block per slide:

```
SLIDE n — {job in the 6-step arc}
TEXT: the overlay copy, exactly as it should be typed (line breaks = separate pills)
EMPHASIS: which words get underline/color/box and why
PHOTO: the request from step 2 (+ alternative)
INTERACTIVE: poll/question/link/none
```

Then: 2 alternative openers for slide 1 (the hook decides everything), a one-line "why this order" note, and the posting note (time-of-day free; sequences post as one run).

## Copy rules (hard)

- Pill-box style: short lines, one thought per pill, 1-3 pills per slide plus one quotable line where it earns it. Lowercase-casual is allowed for founder-voice accounts; match the account's captured register.
- The reframe rule: one belief shift per sequence, repeated, not five.
- The lesson template is available as a pattern: "You might X / You might Y / But you don't have {deliverable} / '{quotable law}'."
- Pain, not situation: "you're tired of watching leads go cold" not "you make 20K/month".
- Real numbers only, from the supplied proof. If proof is thin, write a proof-light sequence (value/Q&A types) and SAY the credibility type needs receipts first.
- Voice guard final pass: no negative parallelism spam, minimal em-dashes, no "here's the kicker", no curly quotes, no invented stats. Sentence-level read-aloud test: would the founder say this on camera?
- Divide-by-three law: any revenue number in the copy attracts people earning about a third of it — calibrate aspirational numbers at ~3x the target client.

## After generating

Offer, don't auto-do: save the sequence into `clients/{name}/content-pipeline.md` (or `wiki/content-engine/` for Pulsify's own) so it's tracked; and note which sequence type + angle it was so performance can be compared per the drop-off diagnostics in the framework.
