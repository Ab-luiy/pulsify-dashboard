---
type: synthesis
tags: [portal, design-system]
sources: output/standard-preview/assets/brand/login-reference.jpg, output/standard-preview/assets/brand/logo-3d-source.jpg, [[wiki/synthesis/kendo-app-teardown-2026-09-17]], founder direction 2026-09-18
created: 2026-09-18
updated: 2026-09-18
---

# Codex brief: Pulsify login page and brand mark

Self-contained. Independent of Phase 3. Two source files are in the repo:

- `output/standard-preview/assets/brand/login-reference.jpg` (2000 x 1117): the founder's mockup of the target login page. Left dark panel with the form, right panel a monochrome baroque statue photograph in clouds.
- `output/standard-preview/assets/brand/logo-3d-source.jpg` (2000 x 1091): a 3D render of the Pulsify mark, a matte black coin with a four-quadrant crosshair of concentric arcs.

The mockup is the layout contract. Reproduce it, do not reinterpret it. The only things to change from the mockup are the wordmark (Pulsify, not Kendo), the logo (ours, not the X), and the copy errors it contains.

## Task 1. The brand mark as vector

The 3D render cannot be used at 24 px. Trace the mark into a flat SVG first, then produce every size from that.

- Geometry, read from the render: a circle. A vertical and a horizontal bar cross at the center, splitting it into four quadrants. Each quadrant holds two nested arcs (an inner quarter-ring and an outer quarter-ring) with a gap between them, and a short radial tick where the outer ring meets the bar. The mark is symmetric under 90-degree rotation. Stroke weight of the bars is about 1/22 of the diameter; the outer ring is about the same; the gap between rings about 1/18.
- Deliver `shared/brand/mark.svg` as a single-color path using `currentColor`, viewBox 0 0 64 64, no strokes (convert to fills) so it scales without hairline loss.
- Deliver `shared/brand/lockup.svg`: mark plus the wordmark "Pulsify" set in Inter 600, tracking -0.02em, mark height equals cap height of the wordmark, gap between them 0.5 em.
- Sizes: favicon.ico (16, 32, 48), apple-touch-icon 180, PWA 192 and 512, all from the flat mark on the warm-black background `hsl(30 8% 6%)`.
- Variations, each as SVG and 1024 PNG under `assets/brand/variations/`:
  1. Flat mark, white on transparent.
  2. Flat mark, black on transparent.
  3. Flat mark in Pulsify green `hsl(156 64% 60%)` on warm black.
  4. Coin: the original 3D render cropped tight to the coin, background removed, exported as PNG with alpha, for use on the login page and marketing only.
  5. Horizontal lockup, white on transparent.
  6. Horizontal lockup, black on transparent.
  7. Monogram: mark inside a rounded square (radius 22 percent) filled `hsl(30 6% 13%)`, mark in foreground, for avatars and the sidebar switcher.
- Post a contact sheet PNG of all seven at `output/qa/2026-09-brand/contact-sheet.png` so the founder can pick in one glance.

## Task 2. The login page

Replace the current `portal/login/index.html` layout. Auth logic, endpoints, and error handling stay exactly as they are. Only the markup and styles change.

Layout, from the mockup:

- Two columns. Left column fixed at 500 px on desktop, dark `hsl(30 8% 6%)`. Right column fills the rest, shows `assets/brand/login-reference.jpg` cropped to the right panel only (crop x from 500 to 2000 on the source, keep the full height), `object-fit: cover`, `object-position: 70% center`. Serve it as AVIF and WebP at 1600 and 2400 wide with a JPEG fallback.
- Below 1024 px the right column disappears and the form is centered with a 24 px gutter, exactly like Kendo.
- Top-left, 52 px from top and 52 px from left: the lockup at 22 px mark height, white. This replaces "X Kendo".
- Form block vertically centered in the left column, max width 396 px:
  - Title 28 px, weight 500, tracking -0.025em: "Welcome back" on the sign-in state, "Get started with Pulsify" on the create-account state.
  - Subline 14 px muted: "Don't have an account? Create one" or "Already have an account? Sign in", the link in the accent color.
  - Email input 40 px, `bg hsl(30 6% 13%)`, border `hsl(30 7% 17%)`, radius 8 px, inner hairline shadow `inset 0 0 0 1px #ffffff0d`.
  - Password input (sign-in state only), same style.
  - Primary button 40 px, radius 12 px, raised neutral `hsl(30 6% 16%)`, white text, `hover: brightness(1.10)`. Label "Sign in" or "Create Account".
  - Divider: a 1 px line with "Or" centered, 12 px muted.
  - "Continue with Google" button 40 px, white background, black text, Google G icon 18 px on the left. Wire it to the existing Google sign-in path if the portal has one, otherwise to the operator Access login at `https://pulsify-ai.com/admin` and label it "Operator sign in with Google". Do not invent a client Google flow that does not exist.
  - "More sign-in options" as a 13 px text button that reveals the email-code option the portal already supports.
  - Legal line 11 px muted: "By continuing, you agree to our Terms and Privacy Policy." with both as links. Once, under the form. The mockup repeats it at the bottom of the panel with typos; do not reproduce that.
- Bottom-left of the panel, 40 px from the bottom: nothing. Keep it clean.
- No headline or copy over the image. The mockup shows the photograph alone and that is the contract.
- Motion: the form block mounts with the shell's 150 ms fade and 4 px rise. Nothing else animates.
- Both themes: the login page is dark only. It does not follow the device theme.

## Task 3. Where the coin goes

- Login page: no. The flat lockup only, per the mockup.
- Portal and console sidebar: the monogram (variation 7) at 24 px replaces the current "P" tile in the workspace switcher and the header brand.
- Client-facing PDFs, the landing page footer, and the Push API docs header: the horizontal lockup.
- Marketing and social: the coin PNG (variation 4). Nowhere inside the product UI, it does not read at small sizes.

## Verification before handing back

1. Screenshots of the login page at 1536 and 390, sign-in state and create-account state, under `output/qa/2026-09-brand/`.
2. The contact sheet of seven variations.
3. Favicon renders correctly in a browser tab at 16 px (screenshot).
4. Existing portal readiness and browser tests still pass. The login form still authenticates against `demo-rio`.
5. Lighthouse on the login page: performance and accessibility above 90. The hero image must be lazy-sized, not a 2000 px JPEG on mobile.
6. Post files touched in `AGENT_CHAT.md`, log in `wiki/log.md`.

## Source trail

- The two reference files named above.
- [[kendo-app-teardown-2026-09-17]] "Layout" and "Motion" sections for the exact measurements the mockup was derived from.
