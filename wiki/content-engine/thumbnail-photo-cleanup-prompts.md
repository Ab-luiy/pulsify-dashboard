---
type: playbook
tags: [content, thumbnails, packaging, prompts, youtube]
sources: [[content-engine/packaging-rules]], User-approved thumbnail photo cleanup workflow (2026-07-01)
created: 2026-07-01
updated: 2026-07-01
---

# Thumbnail photo cleanup prompts

Reusable prompt archive for the exact image-editing workflow approved on 2026-07-01: keep the real photo, clean the room behind the subject, remove the screen overlay, preserve identity, and optionally adapt the frame for homepage use.

## Why this matters for Pulsify

The whole edge here is authority without fake polish. A real camera frame with a real face beats a synthetic guru thumbnail. But the room still has to look intentional. This workflow keeps the operator real and fixes only what weakens the image at thumbnail size.

## Core mechanics

The rules that stayed constant across every good result:

- Preserve the real face, hair, beard, skin texture, pose, shirt, hand pose, money, chair, and microphone.
- Do not beautify, reshape, smooth, puff up, or "upgrade" the subject.
- Remove the small phone/screen overlay at the top.
- Clean the room behind the subject instead of replacing it with a fake studio.
- Tidy the bed, blanket, pillows, loose fabric, and small clutter only enough to stop them competing with the face.
- Keep the image raw, clean, authority-based, and natural.
- If used for homepage hero art, extend the room slightly and tighten the crop only a bit.

## Reusable prompts

### 1. Clean no-text thumbnail photo

Use when the base photo is already strong and only needs cleanup.

```text
Edit the attached photo only. Preserve the original composition, face, hair, skin texture, expression, black shirt, hand pose, microphone setup, and the money exactly as photographed. Do not stylize, beautify, reshape, retouch the face, or change the pose.

Make it a clean YouTube-thumbnail-ready photo with NO text added.

Required edits:
- Remove the small phone/screen overlay at the top.
- Clean the background behind the subject while keeping the same real room.
- Tidy the bed, smooth the blanket, neaten the pillows, reduce messy loose fabric near the chair, and simplify distracting clutter or small details.
- Keep the curtain, wall, bed, radiator, microphone arm, and overall room structure real. Do not replace the room with a fake studio.
- Preserve the black microphone arm and preserve the money exactly.
- Slightly improve contrast and clarity so the subject pops, but keep realistic lighting and a natural photo look.

Style constraints:
- Raw, clean, authority-based.
- No title box, no text, no graphics.
- No luxury flexing, no fake office, no glossy effects, no over-editing.

Output one polished cleaned version of this image only.
```

### 2. Add the yellow-bar title treatment

Use when the photo is approved and only the text layer needs to be added.

```text
Edit the attached photo only, preserving the original composition, facial features, hair, skin texture, expression, shirt, hand pose, microphone, and money exactly as photographed. Do not stylize it, do not beautify it, and do not change the pose or camera angle.

Goal: turn it into a clean YouTube thumbnail while keeping the photo natural.

Edits:
- Remove the small phone/screen overlay at the top.
- Clean only the background clutter behind the subject: tidy the bed, smooth the blanket, neaten the pillows, reduce distracting loose fabric near the chair, and simplify any messy small objects.
- Keep the room real and minimal. Do not replace the room with a fake studio.
- Keep the curtain, wall, bed, and microphone setup, but make the background feel cleaner and more intentional.
- Slightly improve overall contrast and clarity so the subject pops, but keep realistic lighting.
- Preserve the microphone and preserve the money exactly.

Text treatment:
- Add a bold thumbnail text block in the empty space.
- Use a strong condensed sans-serif thumbnail font style, all caps.
- Use black text on a bright yellow rectangular highlight bar.
- Keep it large, crisp, and readable, with a subtle dark shadow.
- Make the text look native to the image, not floating awkwardly.

Style constraints:
- Raw, clean, authority-based.
- No luxury flexing, no fake office, no glossy effects, no MrBeast styling.
- Keep the image looking like a real operator in a real room.

Output one polished thumbnail version based on the attached image.
```

### 3. Homepage hero extension

Use when the image needs a little more room around it so it sits better on a website.

```text
Edit the attached image by subtly outpainting/extending the visible room/background area so the composition has a little more breathing room for homepage use. Keep the subject, face, money, shirt, pose, chair, and microphone exactly the same. Do not stylize or retouch the person.

Goal:
- Make the image feel slightly wider and more spacious than it currently is.
- Extend the wall, curtain, bed, and room edges naturally by a small amount so it works better as a homepage hero.
- Preserve the same lighting, realism, and perspective.
- Do not noticeably change the composition; just give it a bit more background coverage around the edges.
- Keep it clean, natural, and premium.
- No text, no graphics, no fake studio look.

Output one polished version with subtle extra background space.
```

### 4. Tiny face cleanup + slightly closer crop

Use only after the base image is already approved and the change requested is minimal.

```text
Edit the attached image naturally and minimally.

Make these changes only:
- Remove or soften the small dark mark or shadow between the eyebrows so it looks clean and natural.
- Bring the subject slightly closer by tightening the crop a bit, while keeping the composition good for a homepage hero.
- Keep the face, expression, eyebrows, beard, hair, money, shirt, chair, and microphone looking real and unchanged otherwise.
- Do not beautify, reshape, or retouch the face beyond that one small brow-area cleanup.
- Keep the room/background natural and clean.
- No text, no graphics.

Style:
- Realistic, premium, subtle.
- Raw and natural, not over-edited.

Output one polished version.
```

## How Pulsify uses this

This is for founder-channel and operator-facing thumbnails where the real face is the authority anchor and the room is part of the proof that the content is real. The move is not "make it prettier." The move is "remove distractions so the proof reads faster."

The title still has to do its job. Per [[content-engine/packaging-rules]], the image should carry proof or tension, and the title should carry the promise. Do not use the text box if the image already says enough on its own.

## Connections

- [[content-engine/packaging-rules]] — title/thumbnail harmony and the face-on-camera rule
- [[content-engine/ai-content-workflow-thumbnail-profile]] — the other approved thumbnail direction when the asset is a board/workflow visual rather than a raw camera photo
- [[concepts/trust-recession]] — why the real room beats fake luxury polish

## Open questions / gaps

- No first-party CTR data yet on the raw-room-photo style versus the Miro/workflow style.
- Still need a dedicated archive page for final title formulas matched to this photo style.

## Source trail

- [[content-engine/packaging-rules]]
- User-approved thumbnail photo cleanup workflow (2026-07-01)
