---
type: synthesis
tags: [funnel, scaling]
sources: [[raw-sources/inspiration/dustin-varano-infoos/README]], [[synthesis/dustin-varano-video-as-brief]]
created: 2026-09-30
updated: 2026-09-30
---

# Portal design: diagnosis, four looks, and the game plan

The founder rejected the first Graphite preview of the client dashboard on 2026-09-30 ("I don't really like the design at all... use the gradient to make it blend in better... in another shape or form"), asked for an off-white light mode, fewer words on the new funnel screens (InfoOS-style, context only when expanded), and the same tracking views in the operator console. This page records why the first attempt missed, the four looks built overnight, what changed on the funnel screen, and what comes next. Everything here is on the pulsify-saas preview branch `claude/graphite-preview`; nothing is released.

## Why this matters for Pulsify

The portal is the product clients pay for, and the funnel screen is where the InfoOS-style value shows (money at stake, what to fix). If it looks generic or reads like a report, the value does not land. The founder's taste is documented in `visual-references/taste-profile.md`; this round turns it into a working interface.

## Diagnosis of the rejected preview

- The colour was squeezed into a 16px gutter around an opaque panel. His references (Bakers liquid gradients, Pioneer dusk, the lavender and Otherwise cards) all use large, flowing colour that fills the frame with the interface floating crisply on top. Ours read as colour leaking at the edges, not an atmosphere.
- The earlier founder rule "background only around the panel, never inside it" (2026-09-29) was followed too literally. His new instruction relaxes it: the gradient should blend in. Three of the four looks below cross that old line on purpose; one (spotlight) keeps the page calm and puts colour in a single card.
- Light mode was flat grey around a white page. He wants off-white, never bright white, and the gradient to look good in light too.
- The first funnel screen explained every number in sentences. InfoOS shows numbers and shapes and keeps explanations one tap away. Ours was the opposite.

## The four looks (all built, dark and off-white light)

One colour layer sits behind the whole app (`src/components/shell/atmosphere.tsx`, styles under "Portal atmosphere" in `src/app/globals.css`). Numbers always sit on solid or frosted surfaces. A look is chosen with `data-look` on the shell; `?look=` sets it in the preview.

- **Liquid glass** (Bakers reference): broad coral, violet and blue ribbons with a light seam fill the window and drift slowly; the panel steps away and cards become frosted glass. Most expressive, closest to his references.
- **Dusk** (Pioneer reference): a twilight sky fills the window and shows through a see-through panel. Softer; colour is felt more than seen.
- **Bloom** (homepage hero, which he loved): calm surroundings; a glow rises behind the page header and fades into the page.
- **Spotlight**: calm surroundings; the gradient becomes the surface of the key-numbers card only. Most restrained.

Light mode in all four: surfaces moved off pure white (page #f1eee8, panel #f5f3ee, cards #faf8f4) with pastel versions of each gradient (peach, lavender, powder blue, mint).

Recommendation: liquid glass as the everyday look, spotlight as the fallback if glass feels too much after a week of use. Before release, measure scrolling smoothness on an average laptop, since glass uses large blurred layers and frosted cards.

## The funnel screen, calmer (both sides)

Moved to one shared module (`src/features/funnel/funnel-view.tsx`) used by the client Overview and the new operator page.

- Top strip: health ring and score, cash collected, booked calls, worth per visitor. One short line under each.
- One funnel shape (heights square-root scaled, InfoOS-style) with a column per step: grade letter, count, rate. Targets are in the hover title and screen-reader text, not on screen.
- What to fix, in order: collapsed rows show the step, a small progress line against target and the money. Tapping opens the math as chips (40 more people x 3.3% buy x $1,875 order = $2,500), the target's basis, the fix and the action.
- Last 24 hours: value against average, and a +/- figure only when outside a normal day.
- How things are counted moved behind an (i) button.

## Operator access

"Client funnels" is a new operator page (`/app/funnels?client=`) with a client picker and two tabs: the same funnel report and the same videos-by-cash ranking the client sees. Backend: `functions/_shared/client-read.js` lets an operator read any existing client's report with `?client=`, while a client token still only reads its own (tests cover both). The same look and floating panel now apply to the operator shell too.

## Game plan (next, in order)

1. Founder picks a look. Then release the preview branch, re-run the chart palette validator against the off-white card, and measure glass performance.
2. Apply the "numbers first, context on tap" rule to the other text-heavy screens: Performance, Payments, YouTube videos by cash, Tracker.
3. Lead score and the richer opt-in alert (brief item 3). The page tracker already sends active time, scroll depth, full passes and proof-section time; next is the score, a visitor feed (client Leads and operator Leads), and the alert line.
4. Calls: calendar coloured by outcome, post-call form with the pre-sold question, call-day story nudge. Needs calendars connected (per-client sign-in is parked until the first client pays).
5. Payment plans (collected of total) and logging a payment in plain words, then the question box and the monthly report.
6. Sales team and commissions once a client has setters or closers.
7. Still open from before: the founder's own funnel is not on our tracker (no page for his YouTube links); the homepage draft is saved for that day.

## Open questions / gaps

- Which look, and whether the old "never inside the panel" rule is formally retired.
- Glass performance on older machines is unmeasured.
- Chart colours were validated on white cards; off-white is close but needs a validator re-run before release.
- The operator Payments and Integrations pages are client-agnostic, so fix actions there open the page, not the client's row.
- Toasts sit bottom-right and, inside the floating panel, can cover action buttons in that corner until they fade (found by the Reviews test). Moving the toaster to bottom-centre or top-right is a small follow-up.

## Source trail

- Founder messages 2026-09-30; `visual-references/taste-profile.md`, `visual-references/reference-notes.md`, `visual-references/studies/bakers-liquid-gradients/`.
- Captures: `output/qa/2026-09-30-looks/`.
- Code: pulsify-saas branch `claude/graphite-preview`; Pulsify-Brain `functions/_shared/client-read.js`, `functions/api/{funnel-health,video-cash}.js`.
