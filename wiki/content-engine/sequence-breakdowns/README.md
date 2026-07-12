---
type: playbook
tags: [content, instagram, story-sequences]
sources: [[wiki/frameworks/story-sequence-system]]
created: 2026-07-12
updated: 2026-07-12
---

# Story sequence breakdowns — capture protocol

The visual layer of the story-sequence system. Transcripts gave us the theory; this folder holds real sequences, slide by slide, with every visual detail annotated. One page per sequence, screenshots embedded inline next to the dissection, so a sequence can be read and visually understood in one scroll inside Obsidian.

## Where files live

- **Raw screenshots (immutable):** `raw-sources/inspiration/story-sequences/{creator}/{sequence-slug}/01.png, 02.png...` — numbered in posting order, never edited.
- **Breakdown pages (this folder):** `wiki/content-engine/sequence-breakdowns/{creator}-{sequence-slug}.md` — screenshots embedded with `![[...]]`, annotation under each slide.

## The workflow

1. Founder drops screenshots (chat or straight into the raw-sources folder), in order, one image per slide. Include view counts if visible.
2. Claude files them, then writes the breakdown page from [[sequence-breakdown-template]]: every slide transcribed verbatim and dissected.
3. Every captured pattern feeds back into [[frameworks/story-sequence-system]] and the generator: capture the structure and the authority signal, never the surface language.

## What gets annotated per slide (nothing skipped)

- **Overlay text, verbatim** — preserving line breaks, CAPS, punctuation quirks.
- **Emphasis marks** — underlines, highlights, strikethrough, color changes, size jumps, bold words, emoji: which words carry them and why (the emphasized words are the slide's argument).
- **The pause** — anything that makes the viewer tap-hold or dwell: text density, a screenshot that needs reading, a list, small text. Dwell slides are deliberate retention anchors; mark them.
- **Visual layer (full photographic read)** — what's behind the text, deciphered on five axes:
  - **Shot type:** selfie, mirror shot, POV (desk/laptop/car/plane window), over-shoulder, candid-of-founder shot by someone else, group shot, screen recording, dashboard/DM receipt, product/object close-up, scenery, meme, plain color card.
  - **Mood:** the feeling the frame sells — grind (late-night desk, gym), calm authority (suit, stage, boardroom), casual intimacy (bed, couch, walking), celebration (team dinner, award), aspiration (travel, view), vulnerability (tired face, raw morning). Mood is the slide's emotional argument; name it.
  - **Wealth register:** raw / neutral / elevated / luxurious — and what carries it (location, car interior, watch in frame, hotel, first-class cabin) vs deliberately absent. Track this creator-by-creator: it is the proof-currency choice made visible, and where Pulsify's anti-flex delta diverges from the source.
  - **Production level:** phone-raw, phone-composed, edited (color grade, blur, crop), professional. Lighting: natural/golden hour/indoor artificial/flash.
  - **Sync check:** does what is shown match what is said (verbal-visual sync), and does the mood match the slide's 6-step job (pain slides read heavier, result slides read brighter).
- **Interactive elements** — poll (options verbatim), question box, slider, quiz, link sticker (destination), mention, countdown. Placement on the slide.
- **Slide job** — which of the universal 6 steps it executes (curiosity / pain / statement+proof / belief shift / result / close), and which sequence type the whole run is.
- **CTA mechanics** — trigger word, reply bait, link, "DM me X"; slide position of the CTA (the volume-vs-qualification dial).
- **Flow notes** — how this slide earns the next one; where the open loop sits.
- **Performance** — views per slide if captured, computed drop-off, and where the structure broke (slide 2 = hook, slide 7 = body).

## Why this design

- Obsidian renders the images inline, so the page IS the sequence — no switching between a folder of screenshots and a doc.
- The annotations make sequences searchable and comparable: every underline and poll becomes queryable text, which is what the generator learns from.
- Raw images stay immutable in raw-sources per vault rules; the wiki page is the interpretive layer and can be revised as our read improves.
