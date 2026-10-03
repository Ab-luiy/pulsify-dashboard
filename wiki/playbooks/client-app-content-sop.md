---
type: playbook
tags: [content, funnel, product]
sources: [[wiki/frameworks/carousel-system]], [[wiki/content-engine/reel-format-ladder]], [[wiki/frameworks/story-sequence-system]]
created: 2026-10-03
updated: 2026-10-03
---

# Client app content SOP

How a piece of content moves through the client app, from the day it is planned to the money it brings in. This is the order the app is built around (founder round 2026-10-03). It is written as steps first so it can later become the in-app guide.

## Why this matters for Pulsify

Content, offer, funnel, in that order. The app only helps if a client always knows the next click. One path per format, the same shape every time: plan it, make it, send it for review, it ships, the result comes back.

## Core mechanics

### A long-form YouTube video

1. **Plan it.** Content calendar: pick the day, the time and how often (once, every week, every 2 weeks). Reminders stay on by default.
2. **Start it.** Open the piece on the calendar (or from Due today in the Home dock) and press Get started. It opens YouTube, New video.
3. **Find the idea.** New video asks what you have solved and what your students get wrong, then turns the answers into ideas. Pick one.
4. **Package it.** Title and thumbnail step. Title formulas are on the YouTube Overview; references and the thumbnail designer are in 7-fig packaging.
5. **Plan the video.** Build step: opening, outline, proof to show.
6. **Send it for review.** The team reviews it. Approved work becomes a content item.
7. **Production to published.** The item moves In production, Scheduled, Published. Home shows it in the content pipeline.
8. **Read the result.** Funnel (visits, applications, calls, buyers) and YouTube, Videos by cash.

### An Instagram story sequence

1. Plan it on the Content calendar, press Get started.
2. Instagram, Story sequences: pick the sequence type (its job), follow the structure, build each panel.
3. Save it as a project, send it for review.
4. Post it, then log the result (views per slide, DMs) under Instagram, Metrics.
5. Weekly workflow on the Instagram Overview reads the week and says what to make next.

### Reels and carousels

Same path: plan, Get started, build in Reels or Carousels, review, post, log. The format rules live in [[content-engine/reel-format-ladder]] and [[frameworks/carousel-system]].

## How Pulsify uses this

- The calendar's Get started button is the bridge from plan to work: long-form opens New video, shorts and reels open Reels, stories open Story sequences, carousels open Carousels.
- Due today shows in the Home dock (Next move) for planned pieces with a reminder on.
- Proven: the calendar, Get started and Due today shipped 2026-10-03. Theoretical: email reminders (need a scheduled job), the in-app version of this SOP.

## Connections

- [[frameworks/story-sequence-system]] — the sequence builder's rules.
- [[content-engine/reel-format-ladder]] — which reel to make at which stage.
- [[frameworks/carousel-system]] — the carousel structures; a full carousel SOP is still owed.

## Open questions / gaps

- Email and bell reminders when a planned piece is due are not built; only the in-app Due today exists.
- The plan id is passed to the creators (`?plan=`) but the creators do not read it yet, so the working title is not prefilled.
- A thorough carousel SOP (founder ask) is not written yet.

## Source trail

- Founder feedback round, 2026-10-03 (chat).
- pulsify-saas: src/features/content/planner-screen.tsx, src/features/portal-youtube/*, src/features/portal-instagram/*.
