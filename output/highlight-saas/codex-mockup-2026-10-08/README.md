# Pulsify full-sequence design mockup

Review version created 2026-10-08 at the founder's request. Open `review.html` or serve this folder with `python -m http.server 8773 --bind 127.0.0.1` and visit `/review.html`. All 14 frames appear in `contact-sheet.jpg`; three wider sheets are `opening.jpg`, `turn.jpg` and `product-close.jpg`. Individual story exports are `01.png` through `14.png`, each 1080 x 1920.

## Scope

Claude's latest opening is preserved byte-for-byte. Frames 2–14 are new isolated mockups; frame 9 is explicitly a static video storyboard. No Claude template or original photo was overwritten. Canonical locked copy remains unchanged. Proposed copy and existing copy appear in `copy-review.md` and the review page. These are review proposals, not approved launch assets.

Whole original photos are fitted to the frame. The space above uses a mirrored continuation with progressively increasing blur. Local soft dark scrims follow text groups where needed; photo exposure is otherwise retained. This build uses Helvetica, the red emphasis marks, silver phrase backing and the canonical mark on the reveal. The opening retains Claude's behind-subject mark and matte.

## Evidence and limits

The local library photos are the ones already used in Claude's October 8 continuation: IDs 14,20,27,31,38,37,26,47,14,49,41,46,18,34. Photo 9 is excluded. Attempting the prescribed library sync returned Cloudflare authorization error 7403, so current remote library completeness is unverified.

Slide 10 uses the saved actual `voice-context.png` crop. Slide 11 is an explicitly labelled illustrative arrangement of sales fields, without invented metrics or messages. Slide 12 uses unchanged native screenshot pixels from the saved Example workspace funnel, split into two readable groups. Its 170 visits / 102 plays / 93 opt-ins / 22 booked / 4 buyers are demo figures, labelled on the slide; they are not founder or client results. See the existing provenance in `../project/html/assets/product/crops.json` and `sources.json`. No new live product screenshots were captured.

The inherited opening's “a whole year” requires founder confirmation if publishing before a complete year. The proposed version removes unsupported universal niche counts, the 50% DM-loss claim, the giant sample cash result and universal framework-validation wording. It describes tracked links, identified leads and matched payments without claiming identity for every anonymous viewer.

## Rebuild and verification

Run `python build.py`, then `node render.cjs`, then `python sheets.py`. Python needs Pillow and NumPy; the reusable photo lookup comes from Claude's engine. The render script uses bundled Playwright and installed Chrome. Generated slide templates are editable HTML/CSS. Slide 1's existing editable template remains in `../claude-v2/01.html` with the original build and matte scripts.

All 14 PNGs decode at 1080 x 1920. Every newly generated slide passes text-group safe bounds (top 250, bottom 1580), horizontal overflow, text-group intersection and image-load checks. The review page has no horizontal overflow at 390px. `verification.json` records layout checks; `manifest.json` records export hashes. The three sequence sheets and full-size frames 6/8/12/14 were visually reviewed; slide 1 was inspected separately. The review remains a creative proposal, not measured conversion evidence or final approval.
