---
type: synthesis
tags: [create, copy, jane, stories, reels, youtube, audit]
sources: Brain functions/api (studio-generate, studio-carousels, copywriter, youtube-ideas, youtube-titles, youtube-build, thumbnail-suggest, copy-chat), ai-provider.js, Pages secrets list, D1 studio_sequences, a same-prompt test on the demo trader
created: 2026-10-28
status: Findings and recommendation; nothing changed in the writers yet
---

# Create copy check (28 Oct)

Workstream 3 of the Codex brief (synthesis/create-icp-jane-claude-handoff-2026-10-27, in the primary vault). Why Create's copy reads generic, traced through the real code and production settings.

## What writes each piece today

| Piece | Server route | Writer in production | What it is given | Checks |
|---|---|---|---|---|
| Jane chat | /api/copy-chat | Gemini 3.5 Flash Lite (free key), now on the AI SDK | Full method library and task cards, all client details, live lookups into their videos, leads, calls, plan and proof, memory, title bank | Claim check on drafts, number slots on titles, evidence weighing |
| Story sequence | /api/studio-generate | Cloudflare GPT-OSS 120B (no Claude or Gemini key is set for these) | Client details (12 sections, up to 30k characters), the story method with one worked example, approved examples and rules from reviews (none saved yet) | Humanizer only |
| Carousel | /api/studio-carousels | Same | Client details, carousel method, review learning | Humanizer only |
| Reel | /api/copywriter ("Reel script") | Same | Client details, a short reel guide, voice guide, one exemplar | Humanizer only |
| YouTube idea, title, outline | /api/youtube-ideas, -titles, -build | Same | Client details, YouTube method, five generic title formulas (not the title bank) | Humanizer only |
| Thumbnail ideas | /api/thumbnail-suggest | Same | Client details, thumbnail styles | Style check |

The Create writers share one free Cloudflare allowance for the whole account (about 20 stories a day) and 8 uses per client per day. None of them can see the client's real numbers (videos, calls, proof results) the way Jane can.

## What goes wrong

- **Invented results.** A story made in the app on 27 Oct at 04:38 opened with "Student Chad passed the $100k prop firm challenge in just 4 weeks". There is no Chad, no $100k and no 4 weeks anywhere in the demo's data. The number check that stops this exists, but only Jane uses it.
- **Ad voice.** Pills in Title Case with a slogan feel ("The Process: size, plan, trade, review"), far from the lowercase, spoken texture of the real sequences in the vault.
- **Reels are scripted.** Create writes three hooks, a full hook-body-close script, a shot list and a caption. The 15 Oct decision is that we never script reels; they stay raw.
- **Old title formulas.** YouTube titles use the five generic formulas the founder rejected on 13 Oct, not the title voice bank Jane now uses.
- **Credibility without proof.** The demo has no proof cleared for public use, yet Create will still write a "credibility" sequence, which pushes the writer to invent receipts.

## Same request, two writers

The exact story request production builds for the demo trader (credibility, "A student result from this month", 6 slides), sent to both writers.

**Today's Create writer (GPT-OSS 120B), 48 s.** "Student passed a $100k prop-firm challenge / 12 weeks after starting The Process", "Student posted 4 weeks of +$2k net profit / Zero losing weeks in the last month", "Student now receives weekly 1:1 review calls", "DM me "[TRIGGER WORD]" for a free 15-minute strategy audit / Limited spots, act now". Invented numbers ($100k, $2k), an invented delivery feature and banned scarcity.

**Jane's writer (Gemini 3.5 Flash Lite), 22 s.** "you might test a new strategy every week. / you might change your position size after every loss. / you might watch a solid month vanish in two bad sessions.", "size, plan, trade, review.", "if you want to build the same process for your own trading, send me a message and we will review your current plan." No invented numbers or offers, the lowercase pill texture and the lesson template. One "it's not X, it's Y" line slipped through.

Same instructions, same data: the writer and the missing checks make most of the difference, not the instructions.

## Recommendation, in order

1. **One writer for everything.** Move stories, carousels, reels, YouTube and thumbnails onto Jane's writer and context: her model, method library and task cards, live client data, title bank and checks. One path to improve instead of two.
2. **Number and claim check on every Create piece.** Unknown figures become "[your real number]"; invented students, delivery features and scarcity are rejected before the client sees them.
3. **Reels unscripted.** Hooks plus talking prompts from the buyer's daily struggles and the creator's own experience, with recording tips. No full script.
4. **Stories from real examples.** Feed approved sequences (the founder's 13-slide highlight, the Niksetting breakdowns, Nick's draft package) as examples. With no cleared proof, offer a proof-light type and say what proof would unlock a credibility sequence.
5. **YouTube titles from the title voice bank.**

Cost and limits: Jane's free Gemini project has one shared daily allowance, so moving Create onto it adds load. Fine before paying clients; the model and cost research in workstream 7 decides what comes after.
