---
type: playbook
tags: [content, instagram, story-sequences, design, product, sops]
sources: [[wiki/content-engine/pulsify-saas-highlight-final-2026-10-08]], [[wiki/frameworks/story-sequence-system]], [[wiki/playbooks/story-sequence-design-procedure]], [[wiki/playbooks/reference-replication-sop]]
created: 2026-10-09
updated: 2026-10-10
---

# Story sequence client flow (guided, copy first, design second)

How a client builds a story sequence on their own in the app, and how Pulsify builds one for them. It generalizes the process that produced the Pulsify SaaS highlight: copy approved first, design chosen second, photos reused instead of multiplied, and design effort spent only where the moment is big. Founder direction 2026-10-09.

## Why this matters for Pulsify

Stories close the profile funnel ([[concepts/profile-funnel]]). The client-facing story studio only works if a non-designer is led through decisions they would not think to make: what the sequence is about, which angle, which look. The SaaS highlight took about 25 rounds because those decisions were made by reacting to finished slides. This flow moves each decision earlier and makes it a choice between suggestions, so a client reaches a finished sequence in far fewer rounds.

## Core mechanics

### The five stages

1. **Brief.** What is it about, who is it for, what should happen after (reach, DMs, booked calls). The app also asks what the moment is (see tiers below). The app never starts with design questions.
2. **Copy.** Write the copy first, in the client's voice, and iterate until they say it is right. Offer several angles before writing (see "Angles"). Output is the full slide-by-slide copy with one emphasis phrase per slide. Copy is locked before any design.
3. **Look.** Walk the client through the design choices below, each with suggestions and a "you decide" default. Skipped for the simple tier.
4. **Photos.** The client uploads what they have. The app maps photos to slides, reuses the strongest photos, and asks for only the specific shots still missing.
5. **Review and export.** Contact sheet first, then one slide at a time. The client gives changes in plain words. Approval exports the set. Nothing posts automatically.

Each stage can be revisited. A copy change after design reflows the affected slides only.

### Tiers: design is for big moments

Not every sequence should be designed. Over-designing a daily story makes it look heavy and slows the client down. The app picks a tier from the brief, and the client can override.

| Tier | Use it for | What it looks like | Effort |
| --- | --- | --- | --- |
| **Simple** | A take, a problem the client is seeing, Q&A answers, a quick lesson, a daily value sequence | Written copy on a photo or plain background, short pills or auto-fitted text, one emphasis device. No custom cards or charts. | Minutes |
| **Standard** | A case study, a breakdown, a credibility sequence | Brand look applied, one or two designed cards, photo reuse with a blurred carry-over | Under an hour |
| **Designed** | Offer launch, VSL launch, webinar, start-here highlight, product reveal | Full treatment: opener with type behind the subject, designed cards, charts, real brand glyphs, chosen palette and underlines | Rounds of review |

Rule: default to Simple. Move up only when the brief names a major moment. The app asks one plain question to decide: "Is this a big moment (a launch, a webinar, a new offer), or just something you want to say?"

### Dense text on one slide

A simple sequence often needs one long line. Fit it on the slide by lowering the font size slightly instead of splitting it into extra slides, the way Niksetting squeezes a long line onto one frame (founder observation 2026-10-09). The engine fits text automatically. Floor: do not go below about 34 px at 1080 wide, because phone readability decides. Below the floor, split the line into two pills or two slides.

### Angles (offer several before writing)

For any topic, the app proposes three to five angles, each as a type from [[frameworks/story-sequence-system]] plus a hook, and the client picks or mixes. Example for "my leads are going cold": a value angle (the three places leads go cold), a credibility angle (what happened when one client fixed it), a problem-mirror angle (what it feels like to see them go cold), a Q&A angle (the question people ask about it). Each angle comes with two opener variants. The slide 1 hook decides the whole sequence.

### Look questions (ask each one, with suggestions)

For every question the app shows 2 to 4 options with a small preview, a recommended default, and "skip, you choose."

| Element | Ask | Suggestions |
| --- | --- | --- |
| Font | What type feel? | Bold clean sans (default, direct), light sans (calm), serif for one aside line (editorial), heavy condensed (loud, launch energy). Only fonts that are installed and licensed for the render service. |
| Type layout | How should the words sit? | Big stack, three short lines, one emphasis phrase (default). Short pills on the photo. One long line shrunk to fit. Mixed: stack plus a small serif aside. |
| Emphasis | One device per phrase. Which? | Underline (yes or no, then color), a box behind one word, one word in color, a hand circle. Warn: more than one device per phrase reads as noise. |
| Underlines | Do you want underlines? | Yes: thick solid under one phrase (brand accent color). No: use a box or colored word. If yes, which color? Default is the brand accent. |
| Gradients | Do you want gradients? | No (flat, cleaner). Label gradient only: a gradient box behind one phrase. Background glow behind the subject. If yes, which two or three colors? Default is accent to a darker shade of itself. |
| Palette | Which colors? | Brand colors (default). One accent plus black and white. A good-number color for results only. Maximum three colors plus neutrals. |
| Logo | Do you want your logo? | None. Small mark on the first slide only (default for designed tier). Small corner mark on every slide. Upload required for any option but none. |
| Charts | Do you want charts or numbers? | None. A conceptual diagram (steps, funnel, chain), clearly a diagram. A real chart from your real data, which needs the dataset and the timeframe. Never a made-up result presented as real. |
| Visuals | Do you want designed visuals? | None, just the photo. A designed card in place of a raw screenshot. A folded or fanned group of real app logos. A chat or inbox card. Your real screenshot cropped to the part that matters. |
| Depth | Do you want the text behind you on the opener? | Yes (needs a clean cutout of you, the app can make one from a plain-background photo) or no, plain overlay. |
| Photos | How many different photos? | As few as work. See reuse rule below. |
| Proof | What proof do we show? | Real numbers and screenshots you supply. If there is none, the app writes a proof-light sequence and says so. Illustrative figures are allowed only if you choose that and they are not presented as client results. |
| Slides | How long? | Simple: 5 to 7. Standard: 7 to 9. Designed: up to 13 with a gap for a video. |
| Ending | How does it end? | A statement, a question, a DM trigger word, or a link. The app asks which action you want after the last slide. |

### Photo reuse rule

The client's photo library is the constraint, not the design. Use one photo on one slide, then again on the next with the same crop, then a blurred and dimmed carry-over of it behind new copy so it feels continuous. Then change photo. Add a soft drop shadow under any cutout or card laid on a photo. Natural crops only: no mirrored fill, no zoomed-out blur fill unless the photo's own edge colors continue cleanly. Reusing three photos across nine slides is normal.

### Review loop

Show the set as a contact sheet and then slides at phone size. The client replies with plain changes ("make the second line bigger," "swap the red for the green"). The app applies them to the right slide and shows only what changed. Every design change goes through one round of zoom-checking by the studio before the client sees it. A known flaw is never shipped (see [[feedback-perfection-standard]] in memory).

## How Pulsify uses this

- **Pulsify's own sequences:** run the same flow. The SaaS highlight is the reference for the Designed tier; see [[content-engine/pulsify-saas-highlight-final-2026-10-08]].
- **Client delivery:** the portal story studio runs the five stages. The studio operator can run it on behalf of a client with the same screens.
- **Copy before design is a hard gate.** The renderer refuses to start until the copy status is approved.
- **Inputs from the client brain:** voice, offer, customer and proof from the onboarding answers pre-fill the brief and the copy. Voice notes feed the copy tone.
- **Templates:** the reusable slide types live in `tools/story_engine/` (see its README). A client's look is a brand file, so changing a font or a color is one edit, not a rebuild.

## Implementation status (2026-10-10)

Built in pulsify-saas as the Design step on a story sequence (ticket #54, branch claude/story-studio, not yet released): copy confirmation gate, one-at-a-time look questions with suggestions, slide styles (big stack, boxes, fitted long line, red-mark list, cards), the photo reuse rule, live preview and browser PNG export with Geist. Simple and standard tiers only. Not built: designed tier (type behind the subject, stat/chat/inbox cards), angles before copy, client logo upload, server render. See `pulsify-saas/docs/story-studio.md`.

## Connections

- [[frameworks/story-sequence-system]] — types, six-step structure, 9-slide frame, cadence.
- [[playbooks/story-sequence-design-procedure]] — the design procedure and its quality gates.
- [[playbooks/reference-replication-sop]] — the app job contract this flow sits inside.
- [[content-engine/story-design-reference-standard]] — what the reference sequences do.
- [[playbooks/product-explainer-story-script]] — how to write a casual product explainer story.

## Open questions / gaps

- Font licensing for the render service is unresolved. The set of fonts offered must be limited to ones allowed on the server.
- Cutout quality from client photos: the founder supplied a clean cutout for the SaaS highlight. The automatic cutout for clients needs an acceptance test.
- Tier choice by the app is a recommendation; thresholds are untested with real clients.
- The 34 px floor is a starting value to confirm on real phones.

## Source trail

- Founder direction in session, 2026-10-09: guided suggestions per element, copy first and iterated, then design, same picture reused with drop shadow and repurposed, simple sequences stay simple, designed treatment reserved for launches, webinars and similar, fitting a long line by reducing size.
- Founder feedback across the SaaS highlight build, 2026-10-04 to 2026-10-08, recorded in [[content-engine/pulsify-saas-highlight-final-2026-10-08]].
