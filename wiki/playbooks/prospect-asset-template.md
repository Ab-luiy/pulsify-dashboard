---
type: playbook
tags: [outreach, assets, design, funnel, sales]
sources: [[playbooks/prospect-asset-visual-standard]], [[playbooks/prospect-asset-sop]], output/home-draft/home.css, founder directive 2026-10-02
created: 2026-10-02
updated: 2026-10-02
---

# Prospect asset template

The prospect asset is now one template and one JSON file per prospect. Filling the JSON and running one command produces the finished page, so a new asset is a content job and not a design job. The first build from it is the Bergtrades page (`output/bergtrades-asset-v2/`); the empty version is `output/prospect-asset-template/blank/index.html`.

## Why this matters for Pulsify

Every asset so far was rebuilt from the previous one by hand, and the Bergtrades page took several design passes. The design is settled in [[playbooks/prospect-asset-visual-standard]]; what was missing was a way to stop re-deriving it. The founder also asked on 2026-10-02 for the asset to wear the app's own palette and to show the app taking care of most of the work in it, so the page doubles as a first look at the product.

## Core mechanics

Source of truth is `output/prospect-asset-template/`. `fill.py` renders `template/index.html.j2` from a JSON file, copies every referenced asset, and writes `index.html`, `styles.css`, `script.js` and the font. Every block is optional; leave a key out and the slide is skipped. `capture.py` renders the page with headless Chrome and slices it to PNGs so every screen can be looked at. `README.md` in that folder has the five-step new-client procedure and the full schema.

The page, top to bottom: hero (what we made, three lines, three number chips), their own win and the title formula, how content works as three art-zone number tiles, six videos each on the reference frame from their own channel that already worked, the packaging case study, the bio side by side with the highlight rail, quick fixes as before-and-after rows, the six-step VSL with each step opening, the app section, and the locked close.

## How Pulsify uses this

Colour and placement follow the homepage draft, per [[feedback_app_colour_placement]]: graphite ground, charcoal cards, silver-white pill button, the coral, violet and slate dusk as grainy glow behind the hero title, as the art zone on the number tiles and as a quiet glow at the bottom, with one soft coral corner on the formula card.

The app shows up twice. Each slide can carry a small "in your dashboard" strip naming where the app takes that piece over (Content, Home, YouTube), and slide 8 shows six tiles of the real dashboard's jobs: videos ranked by cash, a tracked link per video, titles built from formulas, story sequences for approval, the path each lead took, payments matched to the buyer. Tiles carry the prospect's real public numbers where we have them and say "not linked" where cash would go. The footer line states that nothing is counted until their page, calendar and payments are connected. No invented figures, per the rule in the visual standard.

Wording follows [[feedback_app_wording]]: Home, Content, YouTube, Payments. Never "health".

## Connections

- [[playbooks/prospect-asset-visual-standard]] — the design and close standard this template implements
- [[playbooks/prospect-asset-sop]] — the order of operations around it; build step 3 now means "fill the JSON"
- [[playbooks/prospect-asset-library]] — which asset for which problem; log each built page there
- [[content-engine/copy-voice-guide]] — the copy standard the JSON text has to pass

## Open questions / gaps

- Not deployed. The old Bergtrades page is still the live one at bergtrades.pages.dev. Replacing it is a founder call.
- The six video ideas use reference frames from his own channel as the thumbnail spec. Rendered thumbnail comps per title are not built.
- The VSL slide carries condensed steps, not the full script, and leaves the price and the personal "life" beat open on purpose.
- No reply data on any asset, so the design is craft-validated, not results-validated.

## Source trail

- Founder directive, 2026-10-02: redesign the Bergtrades asset on the new standard, templatize it, and show how the app handles most of it
- `output/home-draft/home.css` and `index.html`, the homepage draft
- `output/bergtrades-page/` and [[playbooks/prospect-asset-visual-standard]], the previous build and standard
