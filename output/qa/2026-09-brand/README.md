# Login and brand QA

Status: complete locally on 2026-09-19. No deployment was run. The Phase 3 deployment hold remains active.

## Mark decision

The founder supplied three treatments. `source-flat-mark.jpeg` is the product master because its geometry remains readable at 16, 24 and 40 px. The silver and black dimensional coins lose detail at UI size and remain marketing references.

- `source-candidates.png` compares all three founder-supplied sources in the intended dark product context.
- `contact-sheet.png` shows the seven delivered production variations.
- `shared/brand/mark.svg` is a one-color, fill-only `currentColor` path in a `0 0 64 64` viewBox.
- `shared/brand/lockup.svg` combines the mark with the Inter 600 Pulsify wordmark.
- `assets/brand/variations/` contains SVG and 1024 px PNG versions of the flat white mark, flat black mark, green-on-warm-black mark, dimensional coin, white lockup, black lockup and monogram.
- `favicon.ico`, `apple-touch-icon.png`, `icon-192.png` and `icon-512.png` are generated from the flat mark on warm black.

The coin cutout used the built-in ImageGen edit path with `source-black-coin.jpeg` as the edit target. The prompt requested background extraction only, a square transparent canvas, exact preservation of the four-quadrant concentric-arc geometry, material, bevels, lighting and perspective, and prohibited redesign, text, scenery and watermarks. The generated master is `assets/brand/coin-cutout-master.png`; the production 1024 px asset is variation 04.

## Login implementation

`portal/login/index.html` now uses the supplied Kendo-style contract: fixed 500 px warm-black auth panel, white Pulsify lockup at 52 px from the top and left, vertically centered 396 px form, and the cropped grayscale architecture image without overlay copy. Below 1024 px the image is absent and no desktop hero file is requested.

The password login, invitation setup, email verification code, resend, redirect, session cleanup and error behavior remain on their existing endpoints. The Google button points to the existing operator Access flow. The create-account state explains the existing invitation-only client onboarding rather than inventing public registration.

## Evidence

- `login-signin-1536.png`
- `login-signin-390.png`
- `login-create-1536.png`
- `login-create-390.png`
- `favicon-16.png`
- `contact-sheet.png`
- `source-candidates.png`
- `lighthouse-login.json`

## Verification

- `node tests/login-brand-browser.cjs`: passes sign-in and create-account rendering at 1536 and 390, desktop responsive hero selection, zero mobile hero requests, dark-only styling, sign-in option reveal, mocked `demo-rio` authentication redirect, overflow, page errors and 16 px favicon rendering.
- `node --test tests/*.test.mjs`: 34/34 pass.
- `node tests/phase1-browser.cjs`: passes.
- `node tests/workspace-browser.cjs`: passes after updating stale expectations for the native Integrations view and pre-seeding already-tested feature introductions.
- Lighthouse desktop on the local login page: performance 94, accessibility 95, LCP 2.5 s, CLS 0, TBT 0 ms.
- `git diff --check`: clean.

## Generated-image prompt

Built-in ImageGen, background-extraction edit. Isolate the exact black metallic circular coin from the supplied source, remove the environment and floor, center the full coin tightly on a square transparent canvas, preserve the exact geometry, proportions, material, bevels, lighting and perspective, and add no redesign, text, backdrop, floor or watermark.
