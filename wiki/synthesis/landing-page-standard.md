---
type: synthesis
tags: [funnel, landing-page, vsl, standard, asset, outreach]
sources: [[synthesis/prospect-funnel-reference-library]], [[raw-sources/vsls/mason-bowstead-funnel-design]], [[raw-sources/inspiration/prospect-funnel-reference-library-2026-06-30]]
status: approved
created: 2026-06-30
updated: 2026-07-01
---


# Landing-page standard — merged Mason + Grant

Approved 2026-06-30. This is the default structure for every prospect/client landing
page Pulsify builds. It merges Grant Garcia's compression with Mason Bowstead's premium
skin. Use it as the starting asset whenever a landing page is needed; deviate only with
a reason.

Reference implementation: `output/standard-preview/` (`index.html` = single-page
default, `optin.html` = the gate fork, `portal.html` = funnel reporting).
Reusable setup starts at `assets/landing-page-standard/README.md`. Reusable assets now
live in `assets/landing-page-standard/canonical/` (approved Codex skin, placeholderized)
and `assets/landing-page-standard/variant-02/` (alternate visual direction, same
runtime contract).

## The merge in one line

Grant's structure (single page, video first, proof crescendo) wearing Mason's skin
(clean white, Inter Tight headline, one accent CTA, controlled spacing).

## Default structure — single page

Top to bottom, one idea per screen:

1. **Brand mark** — small, centered. That is the whole header. No nav.
2. **Qualifier eyebrow** — one line naming who the page is for.
3. **Headline** — Inter Tight, heavy, one mechanism-led promise in the prospect's language.
   See the Headline rule under Copy conventions — this is the single most common way a
   build ends up generic.
4. **Subhead** — one line, names the result, points at the video.
5. **VSL** — large, immediate. Nothing educational sits above it.
6. **One CTA** — solid accent button.
7. **Application** — an **embedded Typeform** (the real form via Typeform's embed
   script, not a mock form), directly under the video. This is the shared spine.
   Default question set: [[frameworks/generic-mmo-application-questionnaire]] — niche-agnostic,
   swap the bracketed tokens per client.
8. **Proof wall** — the crescendo. Testimonials only: real screenshots and raw clips,
   never retyped quote cards. **No featured/explainer video in this section** — the only
   video on the page is the hero VSL. Header in Luke Alexander's style: `People we've helped`.
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

## Skin — one canonical design (Codex's tokens)

There is ONE visual layer for this asset, defined by Codex's design tokens. Every build
uses it so the output is identical regardless of which agent builds the page. Do not
invent a parallel palette or framing.

Canonical tokens (from `output/frank-mason-replica-v2/css/style.css`):

- **Font:** `Inter` (not Inter Tight). Headlines `clamp(44px, 6.4vw, 72px)`, weight 800,
  letter-spacing `-0.058em`, line-height `0.98`. The emphasised `em` is a blue **block**
  with a thick underline.
- **Palette:** `--ink #131720`, `--muted #626a78`, accent `--blue #6871f4`,
  `--blue-soft #eef0ff`, `--lavender #f5f3ff`, `--line #e9e8ef`, full-bleed white background.
- **Signature components:** radial violet hero/closing glow
  (`rgba(112,104,255,…)`); glassy pills with `backdrop-filter: blur(12px)` + a `.pulse-dot`
  glow ring; the video in a 13px white frame, 22px radius, with a solid blue play disc
  (7px white ring); soft shadow `0 22px 70px rgba(68,58,139,.13)`.
- Full-bleed white body — **not** a floating rounded card on a grey backdrop.
- It should feel expensive because it is controlled, not because it is decorated.

### No-freehand rule

When building a landing page, start from Codex's template/tokens and change only the
content. Do not author new CSS, a new palette, or new framing. If the design needs to
change, that is Codex's call (design owner) and it changes in one place — the template —
not per page. The `output/merged-standard-mock/` files define the STRUCTURE; Codex's
`frank-mason-replica-v2` styling defines the LOOK until the genericized template lands.

## Copy conventions

- Testimonial/proof header: `People we've helped` (Luke style). Mason's
  `Don't just take my word for it` is the accepted alternate.
- All copy follows the Humanizer standard. No invented testimonials, figures, or claims —
  every proof slot must be replaced with the prospect's real material before launch.

### Headline rule (2026-07-01, direct user correction)

The hero headline must lead with a **unique mechanism, a specific case study, or a
specific result** — never a generic outcome statement. This is the single highest-value
line on the page and the most common way a build goes flat.

- **Bad (generic outcome, rejected):** "Build a Subscription Brand that pays you every
  month." Restates the promise everyone in the niche already claims. Says nothing
  specific.
- **Fixed (mechanism-led):** "Stop chasing the next winning product. Turn the one you
  have into recurring revenue." Names the actual behavior being replaced (constant
  product-hunting) and the specific mechanism that replaces it (recurring revenue from
  an existing product), not just the outcome.

If a real case study or a specific verified number exists, lead with that instead of the
mechanism — it's stronger. Only fall back to a mechanism-led headline when no verified
result is available yet (see the anti-invention rule below — never fabricate the number
to get a case-study headline).

### Don't add a trust strip under the hero CTA

A row of 2-3 credibility claims directly under the primary CTA (e.g. "7 years in
dropshipping / Multiple 7 figures / 1-on-1 support") is not part of this standard and
was tried and rejected on the Frank build. Two problems: it reopens the disconnected-
slide spacing problem between the hero and the application section (extra margin/padding
+ a visual divider), and it tends to smuggle in unverified specifics about the prospect
that nothing in the research actually confirms. Proof lives in the proof wall, not in a
claims strip. Leave it out.

### Anti-invention rule

Never assert a specific fact about the prospect (tenure, revenue figures, student count)
that isn't confirmed by their public material or CRM record. If the research doesn't
support a specific number, write the mechanism/offer instead — do not invent a
plausible-sounding stat to fill the space.

## Data and integration standard

Every landing page uses the shared integration layer. Do not build a separate tracking
stack per client.

The page declares a permanent client ID and page ID, then loads the shared script:

```html
<body
  data-client="client-slug"
  data-page-id="main"
  data-api-origin="https://pulsify-funnels.pages.dev">

<div data-pulsify-wistia></div>
<div data-pulsify-typeform></div>
<script src="https://pulsify-funnels.pages.dev/js/funnel-integrations.js"></script>
```

The pipe records page visits, CTA clicks, Wistia engagement, Typeform submissions,
native opt-ins, and Kit delivery. A persistent visitor ID joins video activity that
happens before the form to the email submitted afterward. The client-scoped portal
shows the combined record.

The Wistia record includes actual time spent watching, unique seconds watched,
percentage watched, plays, pauses, seeks, completion, playback rate, mute state,
fullscreen/caption events, and exit position. Typeform stores the full answer payload.
Either Typeform or the optional opt-in gate can create the email lead and trigger the
client's Kit tag automation.

See [[synthesis/funnel-portal-pipeline]] for the architecture and setup boundary.

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

- The shared template and integration layer exist. Client copy, proof, Wistia media,
  Typeform, webhook secret, and Kit credentials still need to be supplied per launch.
- The shared hub currently lives on the Frank Pages project. Rename it to a neutral
  Pulsify funnel domain before the second public client launch.
- Luke's AI-native visual overlay is not folded into this standard yet; apply it on top
  for AI/automation/software prospects per the reference library.
