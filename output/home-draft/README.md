# Pulsify homepage draft (saved for later)

Status: SAVED, not in use. Founder, 2026-09-30: "this looks so clean but this is only if we had a landing page. SO SAVE THAT." and "the design looks heat, i fking love it". We already have a main page (the entry page at pulsify-ai.com), so this is not deployed.

Use it when Pulsify needs a real landing page (for example if the founder's YouTube links start pointing at a page instead of Instagram). Ticket: pulsify-saas #38.

## Files

- `index.html`, `home.css`, `home.js`: the page. Kept outside `output/standard-preview` on purpose so no Pages deploy publishes it by accident.
- Preview without a server: `output/qa/2026-09-home-draft/pulsify-home-draft.html` (one self-contained file). Screenshots of desktop, phone and each interactive state are in the same folder.

## What it is

Layout: the Kage "NotchPop" design language (floating pill nav, product shown running in a device frame, one headline and one grey sentence per section, tap-a-problem demo, feature tiles, bento, principle cards, a views-vs-cash switch, proof, one-way-to-work-together card, FAQ, final call to action). Look: the founder's Graphite taste (near-black and charcoal, silver-white pill buttons, a muted coral and violet dusk glow with fine grain around the product, never inside it). Font: Inter, self-hosted.

## Before it ever goes live

- Founder to confirm Nick can be named publicly with his numbers.
- Wire the apply form to our tracker (opt-in to /event with a client row for Pulsify) so the video that sent each person gets the credit.
- Move the inline `style="--x"` attributes into classes if it will sit under the strict CSP used on the root pages.
- Decide placement: replace the root entry page, or its own address for YouTube links.
