---
type: concept
tags: [content, packaging, thumbnails, youtube, retouch]
sources: [[raw-sources/inspiration/thumbnail-retouch-references]], [[content-engine/thumbnail-photo-cleanup-prompts]], [[content-engine/packaging-rules]]
created: 2026-07-21
updated: 2026-07-21
---

# Thumbnail layout patterns

The four layouts Pulsify actually builds, extracted from the 20 reference thumbnails the founder supplied on 2026-07-21. Every one of them is a real photo or a real screen. None are AI-generated scenes. This page is the layout half of packaging; [[content-engine/packaging-rules]] governs the title and thumbnail pairing, and [[content-engine/thumbnail-photo-cleanup-prompts]] holds the retouch prompts.

## Why this matters for Pulsify

The founder's standing rule on 2026-07-21: on a thumbnail we want to look as normal as humanly possible, because the click is only worth having if the viewer arrives thinking this person is not a guru. The reference set is how that gets executed without the thumbnail becoming invisible. Attribution note: the founder named Jonas, Mason, Dustin and Nick as sources across the set but did not map names to files, so this page describes patterns and does not assign a creator to any specific image.

## The retouch standard (applies to every pattern)

Four of the references are the same founder photo at four degrees of retouch. What stayed constant is the standard:

- The person is untouched. Face, expression, hair, beard, skin texture, pose, hands, clothing all exactly as photographed. No beautifying, reshaping, smoothing, or slimming.
- The real room stays the real room. Radiator, curtain, bed, mic arm all still present. Tidied, never swapped for a studio.
- No zoom, no reframing of the subject. The figure just reads better.
- Contrast and clarity lifted slightly so the subject separates from the background. Lighting stays natural.
- Zero text on any of the four.

The move is not "make it prettier." It is "remove what competes with the subject." Same rule already written in [[content-engine/thumbnail-photo-cleanup-prompts]] prompt 1.

## Pattern A — Raw photo, no text

The founder's four retouches. One person, real room, direct eye contact, deadpan. A single prop carries the tension (in the reference set, a $100 bill held to camera). No headline, no callouts, no arrows.

Use when the image alone creates curiosity and the title carries the whole promise. This is the most "normal human" end of the range and the least guru-coded.

## Pattern B — Board breakdown

The board fills the frame and is the background. A person is either physically at a real whiteboard, or present as a small inset. Short headline, often black uppercase on a yellow bar. One to three small labels with hand-drawn arrows pointing at specific parts of the board. App icons used as shorthand so words are not wasted.

The board must be a real board with real content on it. In the references the boards are legible systems, not decorative shapes.

Use for system and framework explainers. This is the [[content-engine/ai-content-workflow-thumbnail-profile]] Miro Proof Board direction generalised.

## Pattern C — Screen recording

**One number, enormous, plus a large face.** This is the part that is easy to get wrong, so it is stated first. In every working reference the key figure is one of the largest objects in the frame, often a third of its width, and the face is big and well lit. None of them show a table, a list, or a full dashboard at its native scale.

> ⚠️ Corrected 2026-07-21. This section previously said "the real interface fills the frame at real scale" with the face in a small corner inset. That reading produced two failed thumbnails: a payout ledger showing twelve rows at native scale and a chart with a small dark face, both of which turned to mush at 120px. Cropping a dense interface only yields a smaller dense interface. The interface is the evidence; one number from it is the subject.

The face sits in a corner as a webcam-style overlay, but large enough to read as a person rather than a stamp. Sometimes a red circle or arrow around the number. Text ranges from a short headline down to none at all, since the number is already carrying the message.

The discipline that separates the good ones from a raw screenshot: browser chrome, sidebars, taskbars and desktop clutter are cropped out or covered. Only the interface that matters survives.

Use for anything where the proof is on a screen. This is the pattern for trade recaps, trade breakdowns, dashboards, and payout ledgers.

**On showing the number (founder ruling, 2026-07-21).** A real figure on a real interface is blunt transparency and it is catchy, so show it. The ledger, the P&L, the payout column with its account IDs and dates: that is the asset, not a liability. What makes a number obnoxious is coupling it with watches, cars or lifestyle, at which point it stops being evidence and becomes a status claim. The variable is the coupling, never the figure. Full rule in [[content-engine/packaging-rules]] rule 5.

## Pattern D — Two people, real location

Two people mid-action in a real place: typing at a desk, talking at a table, pointing at a board. Real office, real city window, real interior. Never an AI background, and the founder specifically noted that the original real background is what makes these work.

Text is restrained here. In the references it is either a yellow-bar headline with small labelled arrows, or plain speech bubbles carrying the question the video answers, or a single elegant two-word title with one arrow. Numbers are often absent entirely.

Use for interviews, mentor-and-student, and any video where the second person is part of the proof.

## Text treatment

The set spans a wide range and the range itself is the lesson.

Restrained end: no text at all, or a plain question in a speech bubble, or a two-word title. Loud end: yellow bar, black uppercase, a large revenue figure, an exclamation mark.

The founder's 2026-07-21 direction pulls toward the restrained end. Hype adjectives, exclamation marks, shock faces and stacked numbers read as guru and cost the trust the click was supposed to buy.

### The rule (founder-ratified 2026-07-21)

**The yellow bar survives on Pattern B only.** On a board breakdown the headline is structural: the board is unreadable at 120px, so a short bold line is the only thing telling the viewer what they are looking at. Black uppercase on a yellow bar stays the treatment there.

**Pattern A and Pattern C go quiet.** A raw photo carries its own tension and a real interface carries its own number, so neither needs a shouted headline. Options in order of preference: no text at all, a plain short label, or a question in a speech bubble. Lowercase or sentence case. No yellow bar, no all-caps headline, no exclamation marks, no stacked figures.

**Pattern D goes quiet too.** The references that work carry a speech-bubble question or two plain words, and mostly no numbers.

Banned across every pattern: hype adjectives, exclamation marks, shock faces, and any number that is not already visible on the real screen behind it.

> ⚠️ Contradiction resolved: this supersedes [[content-engine/thumbnail-photo-cleanup-prompts]] prompt 2, which specified the yellow bar generically, and narrows [[content-engine/ai-content-workflow-thumbnail-profile]]'s "do not soften it" to Pattern B only. Both pages updated 2026-07-21. The titles-thumbnails skill still makes thumbnail text mandatory at four words max and has not been updated; treat this page as canonical where they disagree, per the repo-is-canonical rule.

## Connections

- [[content-engine/packaging-rules]] — title and thumbnail must complete each other, one focal point, reads at 120px
- [[content-engine/thumbnail-photo-cleanup-prompts]] — the retouch prompt archive
- [[content-engine/ai-content-workflow-thumbnail-profile]] — Pattern B's origin as a locked profile
- [[concepts/trust-recession]] — why looking normal outperforms looking successful

## Open questions / gaps

- No CTR data on any pattern. This is observed craft from reference thumbnails, not tested performance.
- The text-treatment contradiction above is unresolved.
- Creator attribution per file is not established and should not be asserted.

## Source trail

- 20 founder-supplied reference thumbnails, `raw-sources/inspiration/thumbnail-retouch-references/`, 2026-07-21
- [[content-engine/thumbnail-photo-cleanup-prompts]]

## The 120px test (run it before shipping any thumbnail)

Downscale the candidate to 120px wide and look at it. If the number is not readable and the face is not recognisable at that size, it fails, regardless of how good it looks at full resolution. This caught two thumbnails that looked acceptable at 1280px and were unusable at real feed size.

```python
from PIL import Image
Image.open('candidate.jpg').resize((120, 68)).resize((600, 340)).save('test.png')
```
