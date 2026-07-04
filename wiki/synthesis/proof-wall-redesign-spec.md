---
type: synthesis
tags: [funnel, content]
sources: [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]], [[raw-sources/vsls/mason-bowstead-funnel-design]], founder direction 2026-07-04
created: 2026-07-04
updated: 2026-07-04
---

# Proof wall redesign + landing template design vet

Founder reviewed the live "People we've helped" section and rejected it. He is right: the template renders eight empty slots labeled with internal category names (Payment proof, Store dashboard, Student DM, Before/after, Ad results, Raw clip, Payout screenshot, Order volume) on the PUBLIC page. Against the library references it reads like a CMS wireframe, not proof. This spec kills the slot taxonomy and vets the whole template design against the approved references.

## What the references actually do (from our dated captures)

- **Mason Bowstead (primary design model):** testimonial bombardment — dozens of real screenshots (~73 at capture) in a continuous vertical feed. No labels, no categories, no captions. Volume is the argument. Skin: white/off-white, Inter Tight 700-900 headlines, Inter body, charcoal text, ONE blue accent, single narrow centered column, generous whitespace, zero decoration.
- **Grant Garcia (The Reserve):** "What our clients say" then a very large screenshot wall — 120+ images at capture — after the application prompt. Compression above the fold, overwhelming proof below.
- **Luke Alexander (AI Insiders):** large people-we-have-helped section, big breathing room, white/black, editorial headline serif. Proof presented at scale, never as labeled slots.

The shared pattern: proof is a raw, unlabeled screenshot feed. The screenshots carry their own context (a DM is visibly a DM, a dashboard is visibly a dashboard). Labeling them defeats the point and empty labeled slots are worse than no section.

## Changes

### 1. Proof wall becomes an unlabeled screenshot feed

- Any number of images, 1 to N. No fixed slot count, no category tags, no captions, no per-image labels anywhere in the public markup.
- Layout: responsive column feed (2-3 columns desktop, 1 column mobile), images at natural aspect ratio, consistent radius and a hairline border, spacing on the 8px scale. It should read as a wall of receipts, not a gallery.
- Order = the order the operator entered them. First few images are the strongest, operator decides.
- Clicking an image opens the full-size file in a new tab. No lightbox build.

### 2. Empty means invisible

If a client has zero proof images, the entire section — heading included — does not render. No shimmer placeholders, no "coming soon," nothing. A page without proof should not announce that it is missing proof. (The demo/test clients are the current worst case: they show all eight labeled empty boxes.)

### 3. Data shape (keep the backend untouched)

`proof_images_json` already stores an arbitrary `{key: url}` object and `functions/api/settings.js` just filters empty values — so numeric keys ("1".."N") make this frontend-only. The renderer must accept BOTH the legacy tag-keyed object (existing Frank data keeps working) and numeric-keyed entries, rendering values in insertion order and ignoring keys entirely.

### 4. Operator UI follows

- /admin #clients and wizard step 7: replace the eight fixed labeled inputs with a dynamic URL list — add row, remove row, simple up/down reorder. Hint: "Screenshots of testimonials, results, DMs, payouts, dashboards. They show in this order. More is better; the references run 70-120 of them."
- Legacy /settings page keeps working (its eight fields map to the same object) but gets no rework — console is canonical now.

### 5. Template design vet (both variants, Mason as the benchmark)

While in there, audit both templates against the Mason tokens and fix drift:

- **Typography:** headlines should carry the Inter Tight heavy-weight feel (or the variant's approved equivalent) with a clear scale hierarchy; body stays quiet. No mid-page font inventions.
- **Emphasis system:** exactly one accent color per page, used for the headline emphasis line and the CTA and nothing else. Nothing else gets color, underline, or highlight. If everything is stressed, nothing is.
- **Spacing:** one 8px scale page-wide, generous section gaps like the references, no seams between sections (the earlier hero/apply seam lesson in [[landing-page-standard]] stands).
- **De-cringe pass:** remove anything that reads as placeholder, badge-stack, fake urgency, or decoration on a live page. The references win on restraint; "dynamic" comes from real content density, not motion or color.
- **Mobile:** 390px no-overflow, feed collapses to one column.

## Acceptance

- A client with 3 images shows a clean 3-image feed; with 40, a dense wall; with 0, no section at all.
- Frank's existing tag-keyed proof data renders unchanged in the new feed.
- No public markup contains internal category names.
- Both templates pass the vet checklist above; screenshot diffs before/after for the founder.
- Live verify on demo-rio (0 images -> section absent) and a temp test client (multiple images -> feed), test data cleaned after.
- Update [[landing-page-standard]]'s proof-wall section when this ships.

## Source trail

- raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30.md (Grant 120+ wall, Luke proof section, hierarchy)
- raw-sources/vsls/mason-bowstead-funnel-design.md (bombardment pattern, design tokens)
- Founder direction, session 2026-07-04.
