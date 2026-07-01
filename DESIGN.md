# Design

Design system for the landing-page standard (`output/standard-preview/`, and the
future `assets/landing-page-standard/` reusable template). Extracted from the current
production CSS — this is the locked skin (see `wiki/synthesis/landing-page-standard.md`
for the no-freehand rule: this system is not to be reinvented per-page).

## Colors

```
--ink:        #131720   /* body text, headline color */
--muted:      #626a78   /* secondary text, subheads */
--blue:       #6871f4   /* accent — CTA, links, pulse-dot, play button */
--blue-strong:#5863ef   /* accent hover/active state */
--blue-soft:  #eef0ff   /* accent tint, light backgrounds */
--lavender:   #f5f3ff   /* secondary tint */
--line:       #e9e8ef   /* borders, dividers, skeleton track */
--white:      #ffffff   /* page background — full-bleed, never a floating card on grey */
--shadow:     0 22px 70px rgba(68, 58, 139, 0.13)   /* the one soft shadow, used sparingly */
```

Strategy: restrained. One saturated accent (blue) at low surface coverage, everything
else near-neutral. The page should feel expensive because it's controlled, not because
it's decorated.

Explicit ban: no colored "card" or "block" treatment on the proof/results section — it
must read as part of the page, not a callout.

## Typography

- **Font:** Inter (system-ui fallback stack). One family throughout — no second display
  face.
- **Headlines:** `clamp(44px, 6.4vw, 72px)`, weight 800, `line-height: 0.98`,
  `letter-spacing: -0.058em`. Emphasis span (`em`) renders as a solid accent-blue block
  with a thick underline, not gradient text.
- **Body:** default Inter weights, `--muted` for secondary copy, `--ink` for primary.

## Components

- **`.section-pill`** — glassy pill label, `backdrop-filter: blur(12px)`, a `.pulse-dot`
  glow ring. Used sparingly as a section eyebrow — not stacked on every section as
  reflexive scaffolding.
- **`.primary-cta`** — solid `--blue` button, one destination, repeated identically
  every time it appears.
- **Video frame** — 13px white border, 22px radius, `--shadow`, solid blue play disc
  (7px white ring) centered on a black `#111` background.
- **Proof grid (`.proof-grid`)** — dense tile wall. Tiles carry no explanatory copy;
  real screenshots/clips only. Density is the argument, not labels.
- **Skeleton/blank states** (e.g. unconfigured Typeform) — shimmer animation on neutral
  `--line`-toned bars, never a dashed-border "placeholder" box with instructional text.

## Layout

- Single narrow centered column (`.shell`), generous whitespace between sections.
- Nothing sits above the hero video except the brand mark, a qualifier eyebrow, and the
  headline/subhead. No mechanism explainer, no stat strip, no education block before
  the fold.
- Application (Typeform) sits directly under the video — the shared conversion spine.

## Motion

- Hover states are subtle scale/opacity, not bounce.
- Skeleton shimmer for unconfigured states: slow (~1.8s), low-contrast, `ease-in-out`.

## Anti-patterns (explicitly rejected)

- Canva-style boxed result-stat lines.
- Gradient text.
- Explanatory placeholder copy on proof tiles.
- Numbered step scaffolding used reflexively rather than because the content is a real
  sequence.
