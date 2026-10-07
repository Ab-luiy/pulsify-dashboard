---
type: playbook
tags: [content, instagram, story-sequences, design, product]
sources: [[content-engine/pulsify-saas-highlight-14-slide]], [[synthesis/saas-highlight-codex-guidance]], [[content-engine/sequence-carousel-design-system]], [[content-engine/sequence-breakdowns/siggyfoss-proof-design]]
created: 2026-10-07
updated: 2026-10-08
---

# Story sequence design procedure (the Pulsify standard)

> Reading order, updated 2026-10-08: the founder's later Whole-photo rule below supersedes the older cover-crop instruction in procedure step 2 for the active highlight. Earlier build status paragraphs are historical snapshots, not current completion status. [[synthesis/story-reference-forensic-audit-2026-10-08]] now supplies the complete 57-image design/copy study and source atlas. Read the relevant original frames before choosing a composition. A new photo per slide, three typography voices and giant numbers are not universal reference requirements; purposeful repetition and simpler type-led frames are documented options. Keep current locked copy and explicit founder choices unless separately changed.

How a Pulsify story sequence is designed, learned while building the SaaS highlight (slides 1, 3, 12 in output/highlight-saas/claude-v2/). It is written so it can be offloaded into the app and run for clients with the same standard. The code that produced it is the proof: build5.py (templates), matte.py + final1.py (subject cut-out and logo behind the subject).

## Why this matters for Pulsify

Content brings the lead, the offer qualifies them, the funnel closes them. Stories are the closing surface of the profile funnel, and the design is half the asset: two people can post the same words and only one looks authored. The standard below is what a client gets, so a known flaw never ships and "close enough" is not a status.

## The quality bar (founder, 2026-10-07)

- Perfect, not "good enough". If I can name a flaw (a rough edge, text touching a graphic, a visible seam), it is not finished and not shown.
- Before showing anything, inspect zoomed crops at full resolution: subject edges, the top and bottom of the frame, every place text meets a graphic or a face. Show only after those pass.
- Everything learned goes into memory and the wiki the same session, so the app can reproduce it for clients.

## Look (locked)

- Palette from the parked homepage: graphite #0b0c0d, warm off-white #f1f1ee / silver #efeee9, soft dusk coral and violet glows, emerald #5fd6a4 only as the single "good number" accent. Red #e5322d hand underline kept (approved). No saturated blue.
- Photos at natural exposure. No brightening, no mid-image fades, no cutouts of the subject for style. Dark scrim only behind text.
- Type: installed Helvetica, Bold for headlines, Regular for body. Big numbers 200px+, tight negative tracking. Labels small, uppercase, letterspaced. One emphasised phrase per slide, in a silver block with graphite text or a red underline.
- Brand: the coin mark is not a corner badge (that reads as template). It appears once or twice in a sequence as an object in the scene: behind the subject on slide 1, and on the reveal/video slide. Never on every slide.
- Numbers on a slide are either real or tagged "sample data". Never an unlabelled invented result.

## Procedure

1. Copy locked first (story-sequence-generator skill). Photos picked from the operator Photo library (/app/photos), one distinct photo per slide unless the founder pairs them. Luxury-brand and car photos are the founder's call; the vault default is to avoid flex.
2. Cover-crop each photo to 1080x1920 (scale to cover, crop by a focus point). Landscape photos are cropped tall around the subject. Never stretch.
3. If text needs room above a subject, move the photo down and continue the top edge: take the photo's own top rows, blur them across, tile upward, and cross-fade the first ~320px of the photo into that fill. A hard join or a flat band shows as a visible square.
4. Add per-pixel dither noise (sigma about 2.6). Do not overlay a tiled grain texture; its tile edges show as squares.
5. Logo behind the subject: draw the mark as a glow (bloom + faint sharp copy + warm screen), then paste the original photo back through a subject matte so the subject is in front. Place the ring so it never sits under a text line (compute where the ring crosses the text rows).
6. Subject matte, preferred: the founder runs a background remover on the original and supplies the cutout (RGBA, same aspect as the photo). Verify alignment (mean abs difference to the original under ~2/255 in solid areas), push its alpha through the same cover-crop and shift as the photo, tighten with smoothstep(.18,.92), and composite the ORIGINAL photo through that alpha so colours stay exactly as shot. This gave a clean hair and shoulder edge on the first try. Fallback when no cutout exists: GrabCut at half resolution seeded by hand-placed shapes (sure-foreground core, probable head and shoulders, sure-background everywhere else; seed the hair explicitly), keep the largest blob, then refine the head with a guided filter on the lifted luminance inside a band around the old edge and tighten with a smoothstep so no dark halo remains. Check at full-res crops.
7. Text and shapes as HTML/CSS/SVG, rendered to PNG with headless Chrome (1080x1920). Keep key content out of the top 250px and bottom 340px.
8. Tracker/pipeline graphics are our own design (rows with a value and a shrinking bar), never a copy of another product's funnel strip.
9. QA before showing: zoomed crops of edges, seams and text-graphic contacts; phone-size view; copy diff against the locked file.


## The engine (app-ready core, 2026-10-07)

output/highlight-saas/claude-v2/engine.py is the reusable core: photo prep (cover crop, zoom, 9:16 box crop, blur, dither, extended top for text room), components (silver emphasis block, self-fitting red hand underline `ul()`, text blocks, absolute placement) and the headless-Chrome renderer with timeout and retries. slides.py holds one function per slide (photo spec + scrim + body); final1.py is slide 1 (logo behind subject via cutout matte). In the app a slide becomes data: photo id and crop, scrim, and a list of components. Every slide still gets the same zoom QA before it is shown.

Extra rules learned building slides 2-14: text never sits on a face, hair, a bright sign or a busy shelf; if the photo has clutter where the text must go, move the text, reframe the photo, or add a soft dark band behind that line only. Photos with the subject high in frame get the extended top (prep_photo_extended). Where the photo is almost black, enlarge the type and add one device (waveform, plateau curve, funnel, dot field) so the slide is not just words.


## Whole-photo rule (founder, 2026-10-08)

Photos are shown whole: never cropped to fill, never painted over with a flat fill. engine.prep_photo_full fits the photo to the frame width and extends the space above it by mirroring the photo's own top edge with a progressive blur (sharp at the join, softer upward), so the colours meet exactly and no seam shows. Check the join numerically (mean brightness across rows either side of it) and by eye. Scenery carries every slide that does not need the founder's face; portraits only where the founder asks for them. Library photo id 9 is banned. Slide-level text sits in the extended area or over a soft dark band, never on a busy part of the photo.

## Failure modes seen (and the fix)

- Logo "blended into the body": soft rough matte. Fix: tight matte, subject pasted over the logo.
- Flat black "cap" over the head: a hand-drawn ellipse to restore hair painted wall pixels. Fix: seed the hair in the segmenter, not a patch.
- Visible squares: tiled grain, hard seam from shifting the photo. Fix: dither and cross-faded edge.
- Text on a face or on a bright ring: reposition the graphic or the text, never ship the overlap.
- Windows out of memory: renders and OpenCV calls fail intermittently when free RAM is tiny; retry, render at half-res for segmentation, keep a subprocess timeout.

## Connections

- [[synthesis/story-reference-forensic-audit-2026-10-08]] - slide-by-slide evidence, composition gates, profile demonstrations, layering and copy transitions
- [[frameworks/story-sequence-system]] (types, cadence, copy), [[content-engine/sequence-carousel-design-system]] (annotation grammar), [[content-engine/pulsify-saas-highlight-14-slide]] (the locked copy and photo mapping), [[synthesis/saas-highlight-codex-guidance]].

## Open questions / gaps

Slides 2, 4-11, 13, 14 not rebuilt in this style yet. Slide 9 video and the laptop-screen UI composite are not built. The whole pipeline needs a UI in the app (photo pick, copy, preview) before clients can run it.

## Source trail

Founder feedback in-session 2026-10-04 to 2026-10-07; build scripts in output/highlight-saas/claude-v2/; references in raw-sources/inspiration/story-sequences/.
