---
name: project-prospect-asset-template
description: "2026-10-02 - the prospect asset is now one Jinja template plus one JSON per prospect (fill.py), on the homepage palette, with the app shown handling the work; Berg v2 and a blank version built, not deployed"
metadata:
  node_type: memory
  type: project
  originSessionId: aa8bcae5-c23d-4045-9fdb-99df5187e92c
  modified: 2026-10-02T11:50:46.189Z
---

Built 2026-10-02 at the founder's request: redesign the Bergtrades asset on the new standard, templatize it for quick fills, and show how the app takes care of most of it.

**Where:** `output/prospect-asset-template/` (template, `fill.py`, `capture.py`, `data/berg.json`, `data/blank.json`, README). Outputs: `output/bergtrades-asset-v2/` and `output/prospect-asset-template/blank/`. Playbook `wiki/playbooks/prospect-asset-template.md`. New client = copy `blank.json`, fill it, `py fill.py data/x.json ../x-asset --assets <folder>`.

**Design:** homepage draft palette and placement (graphite, charcoal cards, silver pill button, coral/violet/slate dusk behind the hero title and as the number-tile art zone, one coral corner on the formula card). The app appears as per-slide "in your dashboard" strips plus a six-tile app slide. Locked close standard kept. Mobile first, zero overflow at 375 checked.

**Why:** every asset was hand-rebuilt from the last one; the design is settled so a new asset should be a content job. See [[feedback_app_colour_placement]], [[feedback_app_wording]].

**How to apply:** build new prospect assets from the template, not from scratch or from the old `bergtrades-page`. The old page is still the live one at bergtrades.pages.dev; v2 is NOT deployed and replacing it is a founder call. Gotchas learned: no `decoding="async"` on images (blank cards in renders), reveal by scroll position not IntersectionObserver, avoid Jinja dict-method keys (`items`, `copy`). The Berg copy line "five are student stories on the vip page" was wrong; v2 says three (H1rvey, JJ, TzFred).
