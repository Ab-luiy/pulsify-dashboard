---
type: playbook
tags: [content, instagram, design, story-sequences]
sources: [[content-engine/pulsify-saas-highlight-sequence]], [[synthesis/pulsify-product-launch-direction]], [[content-engine/sequence-breakdowns/niksetting-new-here]]
created: 2026-10-04
updated: 2026-10-04
---

# Codex design brief: Pulsify highlight sequence

Default logo files: brand/logo/logo.svg, logo.png, lockup.svg.
Owner: CODEX (design, motion, export). Copy owner: Claude. Founder approves. Claim files on the Lock Board in AGENT_CHAT.md before starting.

## CORRECTION 2026-10-04 (founder, overrides anything below that conflicts)
- First pass was wrong: every slide must be a DIFFERENT real photo that matches that slide's mood. No flat graphite text slides.
- Look reference is Siggyfoss: wiki/content-engine/sequence-breakdowns/siggyfoss-proof-design.md and the 8 captures in raw-sources/inspiration/story-sequences/siggyfoss/. Build it like Canva: photo, local darken, proof card or UI crop where marked, type, one annotation (arrow, underline, circle, diamond markers).
- Font: Helvetica Neue (fallback Arial or Inter, whichever renders closest). Bold headline, bold italic for the one emphasised phrase, regular supporting text. White text, one accent colour from the homepage palette.
- Design from wiki/content-engine/pulsify-saas-highlight-14-slide.md (14 slides, picture direction per slide, slide 9 = video). Founder is matching photos to it; no stock and no generated faces.
- Motion references (five X threads): visual-references/studies/pulsify-launch-2026-10-03/README.md. Read all five before animating slide 9.

## What this is
A permanent Instagram story highlight, 12 slides, 9:16 (1080x1920). Viewers are prospects who got an outreach message, open the profile and tap the highlight. Job: make them think "this guy runs a real business and knows his stuff". There is no CTA and no scarcity line, by founder decision. Nothing here claims users or results (none exist yet).

## Copy
Locked text for every slide is in wiki/content-engine/pulsify-saas-highlight-sequence.md. Type it exactly as written: lowercase, line breaks as given (each line is its own pill), straight quotes, no emoji, no exclamation marks. Do not rewrite, add or cut lines. If a line does not fit, tell Claude; do not trim it yourself.
Slide 4 has a four-item list. Slide 7 and 11 each have one quoted line that gets the strongest emphasis.

## Look
- Style reference: Niksetting "New here?" highlight (wiki/content-engine/sequence-breakdowns/niksetting-new-here.md): dark pills with white text over a real photo, one emphasis device per slide (underline, box or colour on one phrase), left or right alignment chosen to fit the photo's empty space. Slides that need no photo (3, 4) use the graphite surface.
- Art direction from wiki/synthesis/pulsify-product-launch-direction.md: warm low-light, natural skin, graphite and charcoal surfaces, silver-white controls, restrained coral/violet/slate glow outside the key content, quiet grain. No cars, watches, hotels, cash or lifestyle flex.
- Use the homepage palette and the app's type. Do not invent new colours.
- Logo: the coin mark only, from brand/logo (mark.svg, lockup.svg, coin-master-3d.png, variations/). Never assets/pulsify-logo.png or brand/retired. Use the 3D coin for hero and motion moments, flat marks elsewhere. Place the logo once, on slide 8 and as a small mark on slide 12. Do not watermark every slide.

## Photos
Founder supplies real photos; do not generate faces or invent likenesses. Request list (ask Claude to relay, or use what is in visual-references/inbox first):
1. desk at night, phone-raw, screen lit (slides 1, 5)
2. hands working or typing, close (slides 2, 9)
3. wider room or window, founder small in frame (slide 6)
4. review moment, laptop beside notes (slide 10)
5. relaxed human shot: walk, gym, laughing (slide 12)
Slides 3, 4, 7, 11 can be text on graphite, with slide 7's quote as the hero typographic moment. If photos are missing, lay out placeholders and flag it; do not substitute stock.

## Slide 8: video with motion graphic
Founder on camera (to be recorded, about 25 seconds, script on slide 8 of the copy file) intercut with a motion graphic.
- Open with the on-screen line "so i built the bridge." over the 3D coin on graphite, slow push in.
- The motion graphic shows the idea of one place connecting the chain from slide 3: content -> traffic -> page -> sales calls -> team -> cash. Use stylised, re-designed UI panels, not raw screenshots, and no readable private data. Panels may suggest: a content plan, a lead list, a tracked link, a call scoreboard, cash by video. Tempo quick, then land on the logo lockup.
- Truth limits: only show what the product actually does or will do by filming. Sales team scoreboard and call KPIs are NOT built yet (see AGENT_CHAT, sales co-pilot). Keep that panel abstract until Claude confirms it exists. No claims of autonomous AI, guaranteed leads or results.
- Subtitles burned in for the spoken line, safe zones respected (top 250px and bottom 340px clear of key content).
- Deliver as MP4 9:16, under 30s, plus the editable project and a still frame.

## Slide-by-slide intent (design only)
1 hook, photo 1, big type, tight.
2 photo 2, one emphasis on "two businesses".
3 text on graphite, the chain as a horizontal line of six words with the coin at the start.
4 text on graphite, four list items stacked, last sentence quieter.
5 photo 1 variant, dimmed, text left.
6 photo 3, text right, calm.
7 belief shift: graphite, quote line largest on the sequence.
8 video.
9 photo 2 variant, text over negative space.
10 photo 4, text left.
11 graphite, the quoted line emphasised, small tracked-link motif in the background.
12 photo 5, warm, small coin mark.

## Deliverables and acceptance
- 12 PNG stills at 1080x1920, plus the slide 8 MP4, named 01.png ... 12.png and 08.mp4, in output/highlight-saas/.
- A contact sheet of all 12 at phone size.
- Check at phone size: text readable, no line wraps differently from the copy file, nothing under the IG overlays, logo is the coin only.
- Do not post, publish or deploy. Hand back to the founder for approval.
- Log files touched in AGENT_CHAT.md and wiki/log.md.

Design overlay plan (arrows, shapes, per-slide device): wiki/synthesis/saas-highlight-annotation-plan.md

## Build method (decided 2026-10-05): no Canva, no third-party design app
Build each slide as an HTML/CSS/SVG template (Canva concepts as code: layers, text boxes, shapes, masks, shadows) with the locked copy read from wiki/content-engine/pulsify-saas-highlight-14-slide.md, then render to 1080x1920 PNG with headless Chrome. Photo prep (crop, directional darken, local desaturate) with Pillow as in output/story-mockups/build.py. Original photos only, faces unaltered (founder rule on the earlier mock). Fonts: Helvetica Neue is not installed on this PC; use Arial (installed) or a free Helvetica-alike, never an unrelated face. Foreground cutouts (Siggyfoss slide 5 move) only via a local on-machine model, optional, skip if it looks rough. Slide 9 motion: deterministic HTML frames plus an encoder; verify an encoder exists before promising the MP4.

Font decision 2026-10-05: founder wants real Helvetica. Not installed and licensed, so templates declare one font variable with the stack "Helvetica Neue", Helvetica, Arial and load files from brand/fonts/ when present (see brand/fonts/README.md). Until the licensed files are added, renders are Arial. Do not source unlicensed copies.
