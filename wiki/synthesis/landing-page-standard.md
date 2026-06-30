---
type: synthesis
tags: [funnel, landing-page, vsl, standard, asset, outreach]
sources: [[synthesis/prospect-funnel-reference-library]], [[raw-sources/vsls/mason-bowstead-funnel-design]], [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]]
status: approved
created: 2026-06-30
updated: 2026-06-30
---

# Landing-page standard — merged Mason + Grant

Approved 2026-06-30. This is the default structure for every prospect/client landing
page Pulsify builds. It merges Grant Garcia's compression with Mason Bowstead's premium
skin. Use it as the starting asset whenever a landing page is needed; deviate only with
a reason.

Reference implementation: `output/merged-standard-mock/` (`index.html` = single-page
default, `optin.html` = the gate fork). **Codex owns the design and the reusable
template build for this asset.**

## The merge in one line

Grant's structure (single page, video first, proof crescendo) wearing Mason's skin
(clean white, Inter Tight headline, one accent CTA, controlled spacing).

## Default structure — single page

Top to bottom, one idea per screen:

1. **Brand mark** — small, centered. That is the whole header. No nav.
2. **Qualifier eyebrow** — one line naming who the page is for.
3. **Headline** — Inter Tight, heavy, one mechanism-led promise in the prospect's language.
4. **Subhead** — one line, names the result, points at the video.
5. **VSL** — large, immediate. Nothing educational sits above it.
6. **One CTA** — solid accent button.
7. **Application** — Typeform-style, directly under the video. This is the shared spine.
8. **Proof wall** — the crescendo. Volume is the argument: real screenshots and raw
   clips, never retyped quote cards. Header in Luke Alexander's style: `People we've helped`.
9. **Closing CTA** — the same CTA, repeated. Same destination every time.
10. **Footer** — brand line + a short results-vary disclaimer.

## Merge rules (where the references conflict)

- **Nothing competes above the video.** No nav, no stat strip, no mechanism lecture.
  Brand → headline → video. This is Grant's discipline and it is non-negotiable.
- **Mechanism is optional and demoted.** Mason explains his model; Grant does not. If the
  research earns it, allow one tight mechanism row, and only *after* the application —
  never above the video. Default to leaving it out.
- **Proof is the backbone.** Grant's ~120-screenshot wall and Mason's "testimonial
  bombardment" are the same instinct. The page lives or dies on real proof volume. A
  skimmed page with an empty proof wall is not shippable.
- **One CTA, one destination.** Repeat the same button; never introduce a competing offer.

## The gate fork — two pages

Use when capturing an email up front is worth the friction (Mason's model):

- **Page 1 — opt-in:** bare. Eyebrow → headline → offer/scarcity line → one email field +
  one button → single preview image → footer. Nothing else.
- **Page 2 — conversion:** the single-page structure above, opened with a short warm
  confirmation line instead of a cold headline.

Default to the **single page (no gate)** unless the email capture is specifically wanted.

## Skin tokens (Mason)

- Inter Tight for headlines (heavy weights), Inter for body.
- White / off-white background, near-black body text, one solid accent CTA color.
- Single narrow centered column, generous whitespace, zero lifestyle decoration.
- It should feel expensive because it is controlled, not because it is decorated.

## Copy conventions

- Testimonial/proof header: `People we've helped` (Luke style). Mason's
  `Don't just take my word for it` is the accepted alternate.
- All copy follows the Humanizer standard. No invented testimonials, figures, or claims —
  every proof slot must be replaced with the prospect's real material before launch.

## Ownership

- **Codex:** design, polish, and the reusable template asset (genericize the reference
  implementation into a drop-in template for any prospect).
- **Standard / structure / copy rules:** this document. Change it only with the user's
  sign-off.

## Connections

- [[synthesis/prospect-funnel-reference-library]] — the full reference set this distills from
- [[playbooks/pulse-system-outreach]] — the sequence that ships this page first, then VSL, then Typeform
- [[synthesis/vsl-pattern-lab]] — patterns for the follow-up VSL script

## Open questions / gaps

- Reusable template (genericized, design-finished) not built yet — Codex to own.
- Hosting/handoff method for live shareable links not locked (currently local preview only).
- Luke's AI-native visual overlay is not folded into this standard yet; apply it on top
  for AI/automation/software prospects per the reference library.
