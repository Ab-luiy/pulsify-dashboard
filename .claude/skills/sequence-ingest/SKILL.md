---
name: sequence-ingest
description: Ingest Instagram story-sequence and carousel screenshots from raw-sources/inspiration/_inbox into the Pulsify vault. Use whenever the founder says he dropped screenshots, mentions the _inbox, or asks to identify/triage/break down story sequences or carousels. Handles identification, sorting, renaming, and the full per-slide breakdown pages. Do NOT freestyle screenshot analysis without this skill - it carries the exact perception method and quality bar.
---

# Sequence ingest — perception and pipeline

You are ingesting Instagram screenshots into the Pulsify brain. Fable built this pipeline and set the quality bar; your job is to match it exactly. Everything you produce becomes training data for the story-sequence generator and evidence for the frameworks, so verbatim fidelity and detail-completeness beat speed.

## Read these first (in order)

1. `wiki/content-engine/sequence-breakdowns/README.md` — the annotation axes.
2. `wiki/content-engine/sequence-breakdowns/niksetting-new-here.md` — THE reference breakdown. Your output must match its density. If yours is shallower, redo it.
3. `wiki/frameworks/story-sequence-system.md` — the theory the captures validate or contradict.
4. `wiki/content-engine/carousel-breakdowns/README.md` — if the drop contains carousels.

## Step 1 — inventory the inbox

Inbox: `raw-sources/inspiration/_inbox/`. List files sorted by name (Windows screenshots sort chronologically: `Screenshot YYYY-MM-DD HHMMSS.png`). Capture-time gaps of >30s usually mark boundaries between different posts/sequences.

## Step 2 — identify what each image IS (read the UI, not just the content)

Read images with the Read tool. Distinguish by interface chrome:

- **Story/sequence screenshot:** segmented progress bar across the top, username + age ("27w") top-left, "Reply to {user}..." bar at bottom. The progress bar is your map: count segments = sequence length; the highlighted segment = this slide's position. A "New here?" or similar label next to the avatar means it's a HIGHLIGHT (permanent asset), not a daily story.
- **Carousel/post screenshot (desktop):** image left, caption + comments panel right, dot indicators under the image (count dots = slide count; filled dot = position), like/comment counts and post date visible. ALWAYS transcribe the caption — it's free corpus material.
- **Reel, DM, profile screenshots:** file under matching folders in `raw-sources/inspiration/`; create a sensible new subfolder if none fits, and say so.

Cluster into groups by: username shown -> capture-time gaps -> progress-bar/dot positions -> content continuity. Verify boundaries by actually reading the first and last image of each suspected group. If membership or order is ambiguous, ASK the founder — never guess (hard rule).

## Step 3 — file them

Move (never copy) out of the inbox:
- Sequences -> `raw-sources/inspiration/story-sequences/{creator}/{sequence-slug}/`
- Carousels -> `raw-sources/inspiration/carousels/{creator}/{carousel-slug}/`
Rename to `NN (HHMMSS).png` — order number plus original timestamp preserved in parens. Raw files are immutable after filing. Flag broken/partial screenshots to the founder for re-capture; keep them numbered in place.

## Step 4 — write the breakdown page

One page per sequence at `wiki/content-engine/sequence-breakdowns/{creator}-{slug}.md` (carousels: `wiki/content-engine/carousel-breakdowns/`). Copy the structure of `niksetting-new-here.md`. Per slide, ALL of:

1. `![[...]]` embed of the raw image.
2. **Text verbatim** — every overlay pill, preserving line breaks, CAPS, lowercase-i quirks, punctuation, [sic] for typos.
3. **Emphasis** — underlines, highlights, colored words, boxes, scribbles, arrows, emoji; and what the emphasis is arguing.
4. **Pause/dwell** — is this a tap-hold slide (dense text, a receipt to read)? Dwell slides are deliberate retention anchors.
5. **Visual (photographic read, five axes)** — shot type; mood (the frame's emotional argument); wealth register (raw/neutral/elevated/luxurious + what carries it); production level + lighting; double sync check (shown-vs-said, mood-vs-slide-job).
6. **Interactive elements** — polls (options verbatim), question boxes, sliders, links (destination), mentions.
7. **Slide job** — which of the universal 6 steps (curiosity / pain / statement+proof / belief shift / result / close from abundance) and how it earns the next slide.
8. **Views/metrics** if visible.

Then the sequence dissection: structure map against the 6 steps, any reusable template detected (state it as a fill-in pattern), emphasis grammar, visual grammar, the authority signal to steal vs the surface language to never copy, the Pulsify adaptation (structures kept 1:1, proof currency ALWAYS swapped to student results/receipts/real work — never lifestyle, founder-ratified), and drop-off if per-slide views exist (slide 2 exit = hook failed, slide 7 exit = body failed).

## Step 5 — feed the system (bookkeeping, mandatory)

1. If the capture confirms, contradicts, or extends `wiki/frameworks/story-sequence-system.md` — update that page and say what changed. Contradictions are findings, not problems: flag inline, never silently overwrite.
2. If it resolves or opens an item in `wiki/synthesis/cross-creator-synthesis.md` (laws / contested dials / gaps), update it. The 7 dials are FOUNDER-RATIFIED — do not relitigate them.
3. Add the breakdown page to `wiki/index.md` (Content engine table) and append a `## [YYYY-MM-DD] ingest | ...` entry to `wiki/log.md`.
4. Post a short entry to `AGENT_CHAT.md` (repo root) per the vault's multi-agent protocol.
5. Report to the founder: what was identified, where it was filed, the top findings, anything broken or ambiguous.

## Quality bar (non-negotiable)

- Every slide gets the full annotation. No "similar to previous slide."
- Verbatim means verbatim — a paraphrase is data loss.
- Never characterize an unfamiliar creator beyond what the screenshots show; if the founder names someone new, ask before describing them.
- Voice rules of CLAUDE.md apply to your prose.
- If you cannot read an image or a detail confidently, say so and ask — a confident-looking guess erodes trust.
