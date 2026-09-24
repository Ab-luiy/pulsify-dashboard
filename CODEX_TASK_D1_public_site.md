# CODEX_TASK_D1_public_site
Ticket: https://github.com/Ab-luiy/pulsify-saas/issues/9
Owner: Codex (design). Reviewer: local Claude. Approver: founder.

Goal: Redesign the public home page and the two sign-in pages from the working placeholders so Pulsify's front door looks premium, minimal and native.

Founder's words: "logo and Pulsify top-left, one headline in the middle, the line 'Your one stop for info, content creation, and building a 7-figure audience.', a Get started button that opens a pop-up with a deep, dark drop shadow asking Operator or Client, each going to its own sign-in page. Minimal, clean, native, no AI slop, no 'Content -> Offer -> Funnel' arrows."

Headline: use the founder's pick, written into index.html `<h1>`:
HEADLINE = "<FOUNDER PICKS ONE: 'Build the audience. Then the business.' | 'Content, clients and growth, run from one place.' | 'The system behind audiences that sell.'>"
If the founder has not picked when you start, keep "Build the audience. Then the business." (current placeholder); it is a one-line change later.

Files you may edit (all under `Pulsify-Brain/output/standard-preview/`):
- `index.html` (home + Get started pop-up)
- `login/operator/index.html`
- `login/client/index.html`
- `site/site.css`
- You may add images under `site/` (self-hosted only). Existing brand assets you may reference: `/assets/brand/variations/07-monogram.svg`, `/assets/brand/login-hero-*` (avif/webp/jpg), fonts at `/shared/fonts/inter-latin.woff2`.
Do not touch anything else. Do not edit `site/site.js` (behaviour is done; if you truly need a hook it lacks, stop and write why in the Lock Board entry).

Data and behaviour already built (keep every one of these working):
- `site/site.js` hooks: `data-open-chooser`, `data-close-chooser` and `dialog.chooser` on the home page; `body[data-audience="operator"|"client"]`, `data-continue`, `data-password` (client page only), `data-notice` on the sign-in pages. Clicking the dimmed backdrop closes the pop-up.
- Links: the pop-up's Client choice goes to `/login/client`, Operator to `/login/operator`. Client page keeps "Use your Pulsify password instead" (`/portal/login`) and the "Operator sign in" switch; operator page keeps its switch to the client page. Footer links `/privacy` and `/terms` on all three pages.
- The notice area shows sign-in errors and "signed out" messages set by site.js (plain text); give it an error style via `.notice.error`.

Hard constraints (the security headers enforce these, a violation breaks the page):
- No inline `<script>` or `<style>` and no `style=""` attributes anywhere. CSS lives in `site/site.css`.
- No third-party requests: no Google Fonts, CDNs, external images or embeds. Everything self-hosted and same-origin.
- No `https://` or `http://` URLs in these three HTML files (the test forbids them).
- `tests/entry-page.test.mjs` and `tests/public-scripts.test.mjs` must still pass.

Design rules:
- Match the product's design language (pulsify-saas `docs/DESIGN.md`): warm near-black dark theme and warm off-white light theme, one green accent used sparingly, Inter, quiet elevation instead of borders. The pop-up gets the deep, dark drop shadow the founder asked for.
- Support light and dark via `prefers-color-scheme` (plus the stored `theme` value if you want, but site.js does not set it; CSS media query is enough).
- Pulsify voice in all copy: plain, direct, no exclamation marks, no emojis, straight quotes, no "->"-style arrow graphics in text. No marketing filler, no stat strips, no feature grids. One headline, one line, one button.
- Works at 390px wide with no sideways scroll; the pop-up fits a phone.
- Motion, if any: subtle (150-200ms fade/scale on the pop-up), and respect `prefers-reduced-motion`.
- Accessible: visible focus rings, the pop-up is the existing `<dialog>` (keep it modal), buttons and links have clear names, colour contrast AA.

Also produce: a short colour and logo spec (hex values for background, text, accent, button, and which logo file) that the founder can paste into the PropelAuth hosted-page settings at auth.pulsify-ai.com so those pages match. Put it at the end of your Lock Board entry.

Done when:
- All three pages match the spec above in both themes at 1440x900 and 390x844.
- `node --test tests/entry-page.test.mjs tests/public-scripts.test.mjs` passes in `output/standard-preview`.
- Screenshots (home, home with the pop-up open, operator sign-in, client sign-in with an error notice via `?auth_error=failed`; desktop and phone; light and dark) are saved under `output/qa/2026-09-d1/` and listed in your Lock Board entry.
- Lock Board: claim the files above before starting, post DONE with the screenshot list and the PropelAuth colour spec.

No deploy, no Wrangler, no commits to main without local Claude's review.
