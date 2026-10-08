---
type: playbook
tags: [content, instagram, story-sequences, design, product]
sources: [[content-engine/pulsify-saas-highlight-14-slide]], [[synthesis/saas-highlight-codex-guidance]], [[content-engine/sequence-carousel-design-system]], [[content-engine/sequence-breakdowns/siggyfoss-proof-design]]
created: 2026-10-07
updated: 2026-10-08
---

# Story sequence design procedure (the Pulsify standard)

## Current shared production entry point, 2026-10-08

The founder's full carousel-reference request now applies the same craft to stories: preserve recognizable real scenery; no blanket blur, mirrored/blurred extensions or artificial text-space fill; use deliberate crops and photo-sensitive composition. Behind-subject type, proof, shapes and canonical brand objects are explicitly wanted. Restore original photo pixels through a registered mask; this is purposeful occlusion, not a sticker portrait replacing the setting.

Run [[playbooks/reference-replication-sop]] with [[content-engine/reference-replication-profile]] for every new story. The JSON profile, source anchors, scene schema and preflight validator provide the portable app contract. Copy/purpose comes first; photo/mask share one transform; meaningful figures use structured data; real app marks identify actual platforms; essential labels stay exposed. Recompose for 9:16 rather than stretching a carousel. The complete new carousel examination is [[synthesis/carousel-reference-forensic-audit-2026-10-08]]; the earlier 57-story audit remains complementary evidence.

This section and the latest pre-launch correction supersede conflicting older engine recipes below. A distinct photo on every frame, mandatory giant numbers and automatic shape decoration are not requirements. Preserve the active highlight's Helvetica, graphite/silver/red-underline choices, current copy constraints and banned photo 9. Reference-study palettes do not silently override those choices. The new renderer integration is specified, not claimed live.

> Reading order, updated 2026-10-08: the founder's latest pre-launch correction in [[synthesis/saas-highlight-codex-guidance]] supersedes the Whole-photo rule below for the active revision. He rejected mirrored extensions and unnecessary zooming out; deliberate cover crops are now authorized. The whole-photo section remains as historical process evidence. Earlier build status paragraphs are historical snapshots, not current completion status. [[synthesis/story-reference-forensic-audit-2026-10-08]] supplies the complete 57-image design/copy study and source atlas. A new photo per slide, three typography voices and giant numbers are not universal requirements. Current explicit founder choices control.

## Pre-launch production correction, 2026-10-08

Choose a useful crop before placing text. Do not manufacture space by mirroring scenery or making the subject unnecessarily small. Product scenes should be purpose-built advertising compositions of actual capabilities, with a clear feature, visible mechanism and practical benefit. Keep key words outside overlapping objects and faces. Test both the complete reading sequence and each frame on its own; the viewer may leave before the next frame.

Use the approved Helvetica/red-underline treatment. A short phrase that fits one line should not be broken into three or four for artificial drama. The whole-chain frame needs actual explanatory detail: square-board content/positioning relationships, a traffic crowd, funnel routes, distinct setter/closer roles and payment-category marks. Its visual complexity must still permit an immediate first read. Do not treat small decorations or an attractive panel as a replacement for the relationship being explained.

The nine-frame review in `output/highlight-saas/codex-launch-v2-2026-10-08/` preserves older assets and rebuilds the story-scale product interfaces as editable HTML/CSS/SVG. Layers may conceal a redundant edge, but cannot conceal a required label, benefit or mechanism. In this pass, the voice surface's lower copy was removed from the overlap, the follow-up surface moved below the call-note labels, the matched-payment scene separated from its supporting copy, and the closing photo text moved off the head. These are local composition lessons, not a claim that the founder approved the result.

How a Pulsify story sequence is designed, learned while building the SaaS highlight (slides 1, 3, 12 in output/highlight-saas/claude-v2/). It is written so it can be offloaded into the app and run for clients with the same standard. The code that produced it is the proof: build5.py (templates), matte.py + final1.py (subject cut-out and logo behind the subject).

## Why this matters for Pulsify

Content brings the lead, the offer qualifies them, the funnel closes them. Stories are the closing surface of the profile funnel, and the design is half the asset: two people can post the same words and only one looks authored. The standard below is what a client gets, so a known flaw never ships and "close enough" is not a status.

## The quality bar (founder, 2026-10-07)

- Perfect, not "good enough". If I can name a flaw (a rough edge, text touching a graphic, a visible seam), it is not finished and not shown.
- Before showing anything, inspect zoomed crops at full resolution: subject edges, the top and bottom of the frame, every place text meets a graphic or a face. Show only after those pass.
- Everything learned goes into memory and the wiki the same session, so the app can reproduce it for clients.

## Look (locked)

- Palette from the parked homepage: graphite #0b0c0d, warm off-white #f1f1ee / silver #efeee9, soft dusk coral and violet glows, emerald #5fd6a4 only as the single "good number" accent. Red #e5322d hand underline kept (approved). No saturated blue.
- Photos at natural exposure, with recognizable scenery. No blanket blur, manufactured fill or sticker cutout replacing the environment. Registered original-pixel subject restoration is authorized for intentional depth. Narrow approved contrast treatment only where needed for text.
- Type: installed Helvetica, Bold for headlines, Regular for body. Big numbers 200px+, tight negative tracking. Labels small, uppercase, letterspaced. One emphasised phrase per slide, in a silver block with graphite text or a red underline.
- Brand: the coin mark is not a corner badge (that reads as template). It appears once or twice in a sequence as an object in the scene: behind the subject on slide 1, and on the reveal/video slide. Never on every slide.
- Numbers on a slide are either real or tagged "sample data". Never an unlabelled invented result.

## Procedure

1. Purpose/question and copy first, using [[frameworks/story-sequence-system]] and [[playbooks/reference-replication-sop]]. Photos come from the operator Photo library (/app/photos). Repeat a photo when an additive reveal or continuity has a reason. Luxury-brand and car photos are the founder's call; the vault default is useful work and proof.
2. Cover-crop each photo to 1080x1920 (scale to cover, crop by a focus point). Landscape photos are cropped tall around the subject. Never stretch.
3. If text needs room, relocate the copy, choose a useful crop, simplify a beat or select another approved photo. Never blur/tile/mirror the top edge or zoom out unnecessarily to manufacture space. The environment stays meaningful.
4. Texture is optional and family-specific. If used, keep it away from small type/source evidence and inspect for seams; do not add noise to every photo by default.
5. Place rear text, cards, figures or the canonical mark as declared scene layers, then restore the original photo through its aligned matte. Keep all required words, metrics and units clear. Glow is optional, not mandatory for a brand object.
6. Subject matte, preferred: the founder runs a background remover on the original and supplies the cutout (RGBA, same aspect as the photo). Verify alignment (mean abs difference to the original under ~2/255 in solid areas), push its alpha through the same cover-crop and shift as the photo, tighten with smoothstep(.18,.92), and composite the ORIGINAL photo through that alpha so colours stay exactly as shot. This gave a clean hair and shoulder edge on the first try. Fallback when no cutout exists: GrabCut at half resolution seeded by hand-placed shapes (sure-foreground core, probable head and shoulders, sure-background everywhere else; seed the hair explicitly), keep the largest blob, then refine the head with a guided filter on the lifted luminance inside a band around the old edge and tighten with a smoothstep so no dark halo remains. Check at full-res crops.
7. Text and shapes as HTML/CSS/SVG, rendered to PNG with headless Chrome (1080x1920). Keep key content out of the top 250px and bottom 340px.
8. Use the selected source recipe's meaningful geometry with our real assets/data. Routes, funnel bands, circles, platform marks and source crops are supported component roles. Declare conceptual versus measured figures; preserve labels and actual topology. No mandatory shrinking bar or universal tracker style.
9. QA before showing: zoomed crops of edges, seams and text-graphic contacts; phone-size view; copy diff against the locked file.


## Historical engine implementation snapshot, 2026-10-07

The next two paragraphs describe past code, not active defaults. Do not call its blur/extended-top functions for the current natural-photo workflow. [[playbooks/reference-replication-sop]] specifies the replacement shared contract and required app integration.

output/highlight-saas/claude-v2/engine.py is the reusable core: photo prep (cover crop, zoom, 9:16 box crop, blur, dither, extended top for text room), components (silver emphasis block, self-fitting red hand underline `ul()`, text blocks, absolute placement) and the headless-Chrome renderer with timeout and retries. slides.py holds one function per slide (photo spec + scrim + body); final1.py is slide 1 (logo behind subject via cutout matte). In the app a slide becomes data: photo id and crop, scrim, and a list of components. Every slide still gets the same zoom QA before it is shown.

Extra rules learned building slides 2-14: text never sits on a face, hair, a bright sign or a busy shelf; if the photo has clutter where the text must go, move the text, reframe the photo, or add a soft dark band behind that line only. Photos with the subject high in frame get the extended top (prep_photo_extended). Where the photo is almost black, enlarge the type and add one device (waveform, plateau curve, funnel, dot field) so the slide is not just words.


## Historical whole-photo experiment, superseded 2026-10-08

Retained as process history. The following mirrored/blurred extension recipe is disabled by the latest founder correction and the current shared production entry point above.

Photos are shown whole: never cropped to fill, never painted over with a flat fill. engine.prep_photo_full fits the photo to the frame width and extends the space above it by mirroring the photo's own top edge with a progressive blur (sharp at the join, softer upward), so the colours meet exactly and no seam shows. Check the join numerically (mean brightness across rows either side of it) and by eye. Scenery carries every slide that does not need the founder's face; portraits only where the founder asks for them. Library photo id 9 is banned. Slide-level text sits in the extended area or over a soft dark band, never on a busy part of the photo.

## Failure modes seen (and the fix)

- Logo "blended into the body": soft rough matte. Fix: tight matte, subject pasted over the logo.
- Flat black "cap" over the head: a hand-drawn ellipse to restore hair painted wall pixels. Fix: seed the hair in the segmenter, not a patch.
- Visible squares: tiled grain, hard seam from shifting the photo. Fix: dither and cross-faded edge.
- Text on a face or on a bright ring: reposition the graphic or the text, never ship the overlap.
- Windows out of memory: renders and OpenCV calls fail intermittently when free RAM is tiny; retry, render at half-res for segmentation, keep a subprocess timeout.

## Connections

- [[content-engine/reference-replication-profile]], [[playbooks/reference-replication-sop]] — shared JSON/Markdown, anchored recipes, masking and app-quality contract
- [[synthesis/carousel-reference-forensic-audit-2026-10-08]] — 76 individually inspected carousel references feeding stories

- [[synthesis/story-reference-forensic-audit-2026-10-08]] - slide-by-slide evidence, composition gates, profile demonstrations, layering and copy transitions
- [[frameworks/story-sequence-system]] (types, cadence, copy), [[content-engine/sequence-carousel-design-system]] (annotation grammar), [[content-engine/pulsify-saas-highlight-14-slide]] (the locked copy and photo mapping), [[synthesis/saas-highlight-codex-guidance]].

## Open questions / gaps

Earlier missing-slide paragraphs are historical build snapshots. The shared profile/schema/SOP and local preflight exist; the new scene payload, registered masking/renderer service and review UI still need live app integration. No approved new story set or deployment is implied by the reference audit.

## Source trail

Founder feedback in-session 2026-10-04 to 2026-10-07; build scripts in output/highlight-saas/claude-v2/; references in raw-sources/inspiration/story-sequences/.

## Superseded engine moves (2026-10-08)
prep_photo_full mirrored/blurred top extension and blanket scrims are disabled per [[content-engine/reference-replication-profile]]. Current builds follow that profile and the reference-elements skill; g1style.py (output/highlight-saas/claude-v2) is the first G1-family build: measured panel fill rgb(12,13,15) ~97% opaque, 1.5px light border + faint halo, 14px radius, huge light lowercase peach-to-pink title, labels with one bold word, thin muted connectors, top-only fade.
