---
type: playbook
tags: [outreach, assets, sop, process]
sources: [[playbooks/prospect-asset-doc-standard]], [[playbooks/prospect-asset-library]], [[outreach/intel/acetrades]], [[outreach/intel/tb-tradez]]
created: 2026-08-02
updated: 2026-08-02
---

# Prospect asset SOP

The end-to-end procedure for building a value asset, start to send. Written after `_acetrades_` and `tb.tradez` were built back to back and the same steps were rediscovered both times, the same three scripts rewritten three times, and the TB document rebuilt four times because the shape was wrong.

Two sibling pages carry the other half. [[playbooks/prospect-asset-doc-standard]] is what the document looks like and how it is written. [[playbooks/prospect-asset-library]] is which asset to build for which problem. This page is the order of operations.

## Why this matters for Pulsify

Every asset built so far cost more than it should have, and none of the cost was in the thinking. It went on rebuilding scrapers, re-deriving the structure, and three drafts spent at the wrong altitude. The craft is settled now. What was missing was a pipeline.

## Phase 1: collect

The founder names the creator and supplies the handle. Nothing gets guessed, ever: not a URL, not a channel, not a follower count. Ask or scrape.

Open `outreach/intel/{slug}.md` first, before any analysis, and log every source into it as it lands. Both existing files are the template.

```bash
python tools/pull_creator_assets.py @their.handle their-slug
```

That scrapes the channel for video IDs and downloads every thumbnail at full resolution into `Desktop\Prospect Assets\{slug}\`. Titles and view counts do not survive the scrape; read them off the channel or get them from the founder.

**Look at the thumbnails at full size before doing anything else.** Twice now that produced the single strongest finding in the document, and both times it was invisible in a screenshot. TB's fabricated phone clock reading 1:89 came from this step.

Instagram is not scrapeable. Reel covers and profile shots are founder-supplied and that is settled, do not retry it.

What the set needs to be complete: profile and bio, the link destination, highlights, the reels grid with view counts, the channel with titles, views and thumbnails, and three or more reel transcripts. Do not start building on a partial set.

## Phase 2: diagnose

Before a word gets written, answer these in the intel file:

1. **Which pillar is broken.** Content, then offer, then funnel, in that order. Getting this wrong wastes the whole asset, which is what happened with acp1re.
2. **Score the five conversion assets** from [[frameworks/instagram-conversion-assets]]. Story sequences, lead magnet, conversion surface, proof content, email. The score is usually the headline.
3. **Which trust stage they are selling at.** Admirable, likeable, credible, trustable. Almost everyone asks at stage one.
4. **Is the mechanism theirs or borrowed.** Ace was teaching AMD, TB is teaching ICT. This has been true of every creator so far.
5. **Find the idea they own and have not named.** Ace's reframe move, TB's think in objectives. This has been the highest-value find in both builds and it is what the document should be built on.
6. **The core leak in one sentence.**

Then give the founder the read before building. Not the document, the read.

## Phase 3: build

Copy the previous build script and swap the content. `output/tbtradez-doc-build.py` is the current reference implementation. The layer above the content does not get reinvented.

Shape, per [[playbooks/prospect-asset-doc-standard]]:

- A hook they recognise from their own life, then a beat, then the bridge. Never open on a framework.
- Four lines of observation. That is the entire diagnosis section.
- **Then built work, and it is roughly four fifths of the page.** Rewritten bio, video titles with thumbnail specs and outlines, their existing assets rebuilt beside the originals, a story sequence written slide by slide, a named lead magnet with its contents.
- Frameworks justify a choice in one line and never get a heading.
- Where they could go differently, short.
- The horizon note, two sentences.
- No CTA.

Under 1,500 words. If a section runs three paragraphs, one of them is repeating the other two.

Story sequences come from the story-sequence-generator skill, never from memory. If the creator has no student results, the type is value-driven; credibility sequences need receipts first.

## Phase 3b: the landing-page preview

Added 2026-08-04. When the prospect's offer page is weak or missing, the document does not rewrite their copy. It shows them the page, filled with their own words.

The two approved skins live at `assets/landing-page-standard/`. `variant-02` is the monochrome dark build. `variant-02-gold-preview` is the gold candidate, retained by founder instruction on 2026-08-04; Codex's note marks it candidate-only and not in the picker, so it is used for prospect previews and nothing else without a new instruction. Both share the same token set, so one fill script produces both.

`output/lukextrades-preview/fill.py` is the reference implementation. Copy it, swap the 25 tokens, and it writes both skins plus a hero-hidden copy of each so the application section can be shot directly.

**Rendering, and this is the part that was missing for weeks:**

```bash
chrome.exe --headless=new --disable-gpu --no-sandbox --hide-scrollbars \
  --allow-file-access-from-files --user-data-dir=%TEMP%\chrome-shot-profile \
  --virtual-time-budget=8000 --window-size=1280,1500 \
  --screenshot=out.png "file:///path/to/index.html"
```

Headless Chrome produces clean 1280-wide PNGs that drop straight into the docx at 4.5in. Notes that cost time to learn: `--user-data-dir` is required or it silently fails, an `#anchor` will not scroll before capture so hide the hero with injected CSS instead, and the in-app browser pane cannot be widened past roughly 300px so it is no substitute.

## Phase 4: verify

```bash
python tools/check_prospect_doc.py "C:\Users\...\their-doc.docx"
```

Voice violations, AI tells, stray placeholders, image count, word count against the ceiling.

**That is not the verification.** The rule stands: never send a document nobody has looked at. Render to PDF, rasterise every page, read them. Check the page count after every change, because one spacing tweak flips a two-pager to three.

> Known blocker as of 2026-08-02: Word COM hangs on this machine, apparently on an unclicked first-run dialog, so `Documents.Add` never returns. Until somebody opens Word once and clicks through, the render step falls to the founder opening the file. Node is also absent here; python-docx plus a manual open is the working path.

## Phase 5: ship and log

Upload to Drive, open as a Google Doc, set anyone-with-link to Viewer, trim the URL to `/view`, send it in the existing thread with the DM from [[content-engine/cold-dm-formula]].

Then, without exception:

- Log the asset into the [[playbooks/prospect-asset-library]] build log.
- Update the intel file: status, date sent, the DM that carried it, and the next best step.
- Record the outcome when it arrives. Sent, opened, replied, what they said.

That last item is the one that keeps getting skipped, and it is the reason three assets exist with zero reply data and the standard is being refined on craft instead of results.

## The permanent tools

| Tool | Job |
|---|---|
| `tools/pull_creator_assets.py` | Scrape a channel, download every thumbnail at full res |
| `tools/check_prospect_doc.py` | Pre-send checks on the docx |
| `output/tbtradez-doc-build.py` | The reference build script to copy |

## Connections

- [[playbooks/prospect-asset-doc-standard]] — the layout and the writing rules
- [[playbooks/prospect-asset-library]] — which asset for which problem, and the build log
- [[playbooks/lead-intel-workflow]] — the per-lead file this SOP writes into
- [[frameworks/instagram-conversion-assets]] — the five-asset score in phase 2
- [[content-engine/cold-dm-formula]] — the message the link travels in

## Open questions / gaps

- No reply data on any asset built so far, so every step here is craft-validated and none of it is results-validated.
- The render step is blocked on this machine. Until that clears, phase 4 is half a phase.
- Instagram evidence stays manual. If that ever becomes a bottleneck, Apify is the paid route.

## Source trail

- The `_acetrades_` build, 2026-08-02, `outreach/intel/acetrades.md`
- The `tb.tradez` build and its four drafts, 2026-08-02, `outreach/intel/tb-tradez.md`
- The FITFO build, 2026-07-21, `output/fitfo-doc-build-short.js`
