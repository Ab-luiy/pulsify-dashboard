---
type: playbook
tags: [content, instagram, carousels, design]
sources: [[wiki/content-engine/sequence-breakdowns/README]], [[wiki/synthesis/niksetting-extractions/17-300k-month-posting-schedule]]
created: 2026-07-12
updated: 2026-07-12
---

# Carousel breakdowns — capture protocol

Sister protocol to [[sequence-breakdowns/README]], for the heavily designed, edited carousels whose visual craft is itself the authority signal. Carousels are the thinnest part of both ingested corpora (one section in Niksetting 17: life-update mode and storyline mode — headline + 5-6 steps + CTA), so this folder is where the real knowledge gets built: from captured examples, design detail by design detail.

## Where files live

- **Raw images (immutable):** `raw-sources/inspiration/carousels/{creator}/{carousel-slug}/01.png...` — numbered in swipe order, cover first. Include the caption as a text file or final screenshot, and engagement counts if visible.
- **Breakdown pages (this folder):** `wiki/content-engine/carousel-breakdowns/{creator}-{slug}.md` — images embedded inline above the annotation, one scroll per carousel in Obsidian.

## What gets annotated per slide

- **Copy, verbatim** — headline, body, captions on the slide; line breaks preserved.
- **Typography system** — typefaces/weights in play, size hierarchy (what's biggest and why), letter spacing, which words get bold/underline/color/highlight treatment.
- **Layout** — grid/alignment, margins and whitespace, where the eye lands first, text-to-image ratio, element count per slide.
- **Color and treatment** — palette, background (photo/flat/gradient/texture), contrast moves, brand-color consistency across slides.
- **Design devices** — arrows, circles/scribbles, annotation marks, mockups/screenshots-in-frame, charts, icons, photo cutouts, drop shadows, borders.
- **The swipe engine** — how the slide forces the next swipe: cliffhanger line, numbered progression, visual continuation across the seam (elements bleeding across slides), curiosity gap.
- **Slide job** — hook (cover), context, step, proof, recap, CTA.
- **Density/dwell** — reading time per slide; deliberately slow slides.

## Carousel-level dissection (per page)

- **Cover analysis** — the scroll-stopper: hook copy, visual weight, why a feed-scroller stops. The cover is the carousel's thumbnail; it gets the deepest read.
- **Structure map** — e.g. cover hook -> 5 steps -> proof -> CTA (the Niksetting storyline mode) vs pure design-flex life-update mode.
- **Design system read** — the reusable visual grammar: could a template be built from this? What would Pulsify's version look like with our palette and proof currency?
- **Caption + CTA** — caption verbatim, comment-bait/trigger word, saves-optimization signals (carousels are the save format; save rate is the metric).
- **The authority signal vs the surface language** — steal the structure and craft standard, never the niche phrasing.
- **Feeds back to:** the (pending) carousel framework page in content-engine; until enough captures exist, this folder IS the carousel knowledge base.

## Workflow

Same as sequences: founder drops images in order (chat or the raw folder), Claude files, transcribes, and dissects. Design replication notes are written so a designer (or a Codex-built template later) could rebuild the layout without seeing the original.
