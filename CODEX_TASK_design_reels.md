# CODEX TASK — design direction in the generator + the Reels surface (production portal)

Author: Claude. Date: 2026-07-13. Founder authorized this overnight (PC left on).

## What this is

Two additive features for the PRODUCTION client dashboard, both already designed, verified, and deployed in the preview at `https://pulsify-funnels.pages.dev/portal-preview/` (source: `output/standard-preview/portal-preview/index.html`). Your job is to implant them into the real product. The preview is the visual and interaction contract. Do not redesign; match it.

Read these first (they are the spec):
- `wiki/content-engine/sequence-carousel-design-system.md` — the design grammar (annotation layer, type, image classes, chip code, currency swap).
- `wiki/content-engine/reel-capture-to-content-engine.md` — the reel engine (two modes, capture inbox, translation, angle library, reframe rotator, confidence loop).
- The preview file above for the exact UI.

## Feature 1 (PRIMARY) — design direction in the generation contract

Right now `studio-generate` returns sequence copy. It must also return, per slide, the design direction, because the look is half the asset.

- Extend `output/standard-preview/functions/_shared/sequence-prompt.js` so the generated (or manual-mode) output specifies for every slide:
  - `annotation`: one of {red-underline, green-underline, green-check, red-x, red-box, blue-arrow, red-word, none} plus which line or word it lands on. One to three per slide, never on every word.
  - `image_class`: one of {proof-screenshot, device-mockup, proof-wall, real-workspace} plus a specific artifact slot string (e.g. "student Stripe dashboard showing $50k"). NEVER a lifestyle/flex option — the currency rule is structural.
  - `treatment`: pill-box vs drop-shadow, and left/right alignment.
  - `chips` (carousels/taxonomy only): the cadence/function/audience colour code.
- Update `output/standard-preview/functions/api/studio-generate.js` so the response carries this design block per slide, and manual mode (no LLM key) still emits it deterministically from the type + slide role.
- Update the portal Studio UI in `output/standard-preview/portal/index.html` to render the per-slide design direction under each slide's copy, matching the preview's `.dd` treatment (annotation / image / type rows). Keep all existing P2 studio flow intact.

Currency guardrail is enforced in the image_class picker: the four allowed classes only.

## Feature 2 (SECONDARY, only if Feature 1 is clean) — the Reels surface

Add a Reels section to `output/standard-preview/portal/index.html` matching the preview's Reels tab:
- Two mode cards: Redistribution (clip a long-form video or call) and Origination (a thought becomes a reel).
- A capture inbox (text input) that, on submit, produces a thought row that expands to four format cards (reel / story sequence / carousel / long-form segment). Reuse the existing `studio-generate` endpoint in manual mode for the copy; do NOT build new storage plumbing. Thoughts may live in the page/session for v1 (same pragmatic line as the deferred studio upload).
- The angle library (6 fixed angle cards) and the reframe rotator (one belief, several presentations), static from the spec.
- Add a nav entry for Reels. Keep it consistent with the Trakyo shared UI (`output/standard-preview/shared/pulsify-ui.css`).

## Discipline (non-negotiable, same as P1-P3)

- LOCAL-VERIFY ONLY: `node --check` every touched JS file; extract and check the portal inline JS; mocked-D1 handler test for `studio-generate` proving the new design block is present in both LLM and manual paths. Confirm the existing P2/P3 flows still pass (generate -> draft -> review -> approve).
- NO deploy. NO remote D1. NO commit. NO new secrets.
- Voice on all copy: no em-dashes or en-dashes, no reward/celebratory microcopy, sentence case, student-proof currency only.
- Claim the files on the AGENT_CHAT.md Lock Board before editing; post a done note with the exact diff when finished. Claude reviews the logic and the design fidelity, then deploys.

## Files in scope (lock these)

- `functions/_shared/sequence-prompt.js`
- `functions/api/studio-generate.js`
- `portal/index.html` (Studio design-direction render + Reels section + nav)
- (only if truly needed) a small addition to `shared/pulsify-ui.css`

## Definition of done

Feature 1 shipped and locally verified; Feature 2 shipped if Feature 1 is clean; both match the preview; all existing flows intact; done note posted to AGENT_CHAT with the diff; nothing deployed or committed. Claude picks it up for review + deploy.
