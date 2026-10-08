# Pulsify pre-launch v2

Nine-frame review responding to the founder's October 8 critique, including the subsequent slide05 tracking rewrite. Open `review.html` or serve this folder on port 8774. Exports: `01.png` through `09.png` at 1080 x 1920. `contact-sheet.jpg` shows all frames; `opening.jpg`, `argument.jpg` and `product-close.jpg` are wider reading strips. The preceding complete review is retained at `revisions/before-tracking-rewrite/review.html`.

## Direction and scope

The earlier 14-frame sequence felt too slow and its screenshots/mirrored photos were rejected. This revision uses the founder's current direction: passionate personal opening, distinct payoff per frame, a visual two-business comparison, detailed whole-chain expertise, concise voice copy, and story-scale product-launch scenes. Typography and red underlines are preserved. Nine frames and the wording remain proposed; no creative approval or measured retention improvement is claimed.

Photos 31,49,47,14 use natural CSS cover crops with intentional focus points. No mirrored extension is produced. The opening uses Claude's existing behind-subject mark background, with new copy. Original library files and Claude sources are preserved. Slide05 now visualises long/short publishing and the missing journey after the view, with four single-line questions. There is no new recorded video in this still review.

Product scenes6/7/8 are advertising visualisations built as editable native HTML/CSS/SVG, not screenshots or exact current interface captures. The new order is voice/content, UTM source plus funnel-page watch activity and person/payment journey, then Sales Co-pilot brief/notes/reviewed five-touch follow-up. The authored content angle and watched-segment strip are illustrative. No fictitious message, revenue figure, client performance or autonomous sending appears. Notes in the review, `slides.json` and `tracking-evidence.md` explain the capability boundaries. The close connects what is posted to what happens after.

UTM parameters capture tagged clicks; they do not identify all native YouTube/Instagram viewers or reveal their individual viewing history. Watch activity comes from the embedded Wistia player on the funnel page. Visitor activity can join to an email after identification, then to bookings and confirmed matched payments. Attribution uses the first tagged source, net of refunds; untagged journeys and unmatched payments are outside the promise.

The chain includes the founder-requested personal-branding mini-board, crowd, landing routes, distinct headset setter/closer figures and Fanbasis/Whop/Stripe marks. Those are payment-category examples, not an assertion of three live integrations. Stripe/Whop marks were retrieved from their official public assets. The historical Fanbasis icon comes from The Org's identified Fanbasis page because the current official site serves a different identity; exact provenance is in `assets/brand-provenance.json`. The failed favicon attempts are preserved as research artifacts, not referenced by the slides. No external brand research was inserted into the wiki as business doctrine.

## Build and review

Run `python build.py`, `node render.cjs`, then `python sheets.py`. Python uses Pillow for sheets and copies existing assets without modifying originals. The scene renderer uses bundled Playwright and installed Chrome. All source text uses explicit UTF-8. The review page is responsive at390px with no horizontal overflow. All nine PNGs decode at1080x1920; text group bounds, overflow, overlaps and image loads pass in `verification.json`; export hashes are in `manifest.json`.

The three reading strips and full-size chain/product/voice/closing frames were visually inspected. Copy occlusions in the layered Voice and Sales scenes were removed, payment scene/body spacing corrected and closing copy moved away from the head. A passing geometry check is not creative approval. No publication, deployment or cross-call.
