---
name: project-prospect-asset-sop
description: "The five-phase prospect asset pipeline and the two permanent tools, built 2026-08-02/04"
metadata: 
  node_type: memory
  type: project
  originSessionId: 916c08ce-89c7-45f2-a572-b2dda72c8557
  modified: 2026-08-05T01:37:05.564Z
---

`wiki/playbooks/prospect-asset-sop.md` is the end-to-end pipeline: collect, diagnose, build, preview, verify, ship and log. Written after three assets were built back to back and the same steps kept being rediscovered.

**The tools, both permanent:**

- `python tools/pull_creator_assets.py @handle slug` scrapes a YouTube channel for video IDs and downloads every thumbnail at max resolution into `Desktop\Prospect Assets\{slug}\`. Looking at those at full size produced the strongest finding in two of three builds and both were invisible in a screenshot.
- `python tools/check_prospect_doc.py "path.docx"` checks banned glyphs, the AI-tell patterns from the copy voice guide, stray placeholders, image count and the 1,500-word ceiling. It failed the TB build three times and every fix was a real cut.

**Landing-page previews:** `output/lukextrades-preview/fill.py` fills both approved skins (`variant-02` monochrome, `variant-02-gold-preview` gold) with a prospect's copy. Render with headless Chrome; `--user-data-dir` is required or it silently fails, `#anchor` will not scroll before capture so hide the hero with injected CSS, and the in-app browser pane cannot exceed roughly 300px so it is no substitute.

**Instagram evidence stays manual.** IG blocks scraping and that is settled.

**The standing gap:** three assets exist (`_acetrades_` sent, `tb.tradez` and `lukextrades` built) and none has reply data, so every rule in [[feedback-value-asset-is-built-work]] is craft-validated and none is results-validated. Filling the build log's outcome columns is the highest-value thing available. Follow-up drafts for ghosted prospects are in `wiki/content-engine/cold-dm-formula.md`, untested.
