---
type: content-engine
tags: [youtube, titles, thumbnails, packaging, jane, voice]
sources: [[content-engine/pulsify-content-niche-batches-2026-06]], [[content-engine/packaging-rules]], [[synthesis/content-decisions-recap-2026-10-27]]
created: 2026-10-27
updated: 2026-10-27
---

# Title voice bank

The titles Jane learns from. Jane reads this page (built into the app by `output/standard-preview/tools/build-title-bank.mjs`) every time someone asks her for titles. The founder's own rewrites are the most important part: they show the tone, so Jane matches them most closely.

## How to add to it

- When the founder rewrites a title in his own words, add it under "Founder rewrites" the same day, as `- \`his title\` | thumbnail text | what it was before or why`.
- Niche examples use the same line format under their niche heading. Figures in examples are illustrative; Jane is told to use the client's real numbers or leave a slot.
- After editing, run `node tools/build-title-bank.mjs` in `output/standard-preview` and release. `--check` fails if the app's copy is out of date.
- No em dashes, no question marks, lowercase except names. Never a source creator's name.

## The method Jane follows

- Give exactly the number of titles asked for (3 when no number is given). Each title gets a thumbnail text that completes it without repeating its words.
- Lowercase except names and acronyms, under about 60 characters, the core readable in the first four words, no question marks, a short bracketed ending: (step by step), (full breakdown), (copy me), (do this), (proof).
- The topic is the craft itself: the trade, the setup, the product, the number. Never content about content, funnels or selling a course.
- Every title has a concrete, measurable result. Real numbers come from the client's own videos, proof or chat; with no real number, leave a slot like [your real number].
- Five structures, mixed: A result reveal (how i + result + timeframe), B watch me (watch me + action, live), C the system (the setup or method that + result), D contrarian (stop or don't + the common move, then what works instead), E how i + mechanism + result.
- Two tiers, mixed: broad (a milestone or no number, for reach) and specific (the creator's exact odd number, for proof).
- Thumbnail text: 2 to 4 words, the emotional punchline, never all caps, never repeats the title.

## Founder rewrites

None saved yet. The founder's earlier rewrites could not be found on 2026-10-27 (not in any Claude or Codex chat on this PC, the vault or the app), so the next round goes here.

## Trading

- `the price action setup that got me funded in 9 days (step by step)` | funded, fast | E, specific
- `how i turned $1k into $27k with one forex strategy (full breakdown)` | one setup | A, specific
- `stop scalping, this swing setup made me $40k last month (proof)` | scalping is a trap | D, specific
- `the beginner forex strategy that actually works (step by step)` | start here | C, broad
- `how i went from $0 to my first $10k trading (full breakdown)` | first 10k | A, broad
- `watch me pass a funded challenge live (step by step)` | one day, one pass | B, broad

## Amazon FBA

- `how i made $38k in one month with a single fba product (full breakdown)` | one product | A, specific
- `the sourcing method that doubled my amazon margins (step by step)` | 2x your margins | E, specific
- `don't chase trending products, this boring niche prints on amazon (proof)` | boring wins | D, specific
- `from $0 to your first $10k on amazon (step by step)` | first 10k | A, broad
- `the fba product research method that actually works (copy me)` | find the product | C, broad

## Ecommerce

- `the winning product that did $84k in 30 days (full breakdown)` | this product | A, specific
- `the tiktok ad strategy that scaled my store to $50k/mo (copy me)` | $1 a day | E, specific
- `stop testing 100 products, this validation trick wins faster (proof)` | test less, win more | D, specific
- `how to find winning products that actually sell (step by step)` | winning products | C, broad
- `from $0 to your first $10k dropshipping (full breakdown)` | first 10k | A, broad

## TikTok Shop

- `how i made $22k in tiktok shop commission last month (full breakdown)` | commission stack | A, specific
- `the product seeding system that got me 40 affiliates (step by step)` | they sell for you | E, specific
- `going viral didn't make me money, this product strategy did (proof)` | views aren't sales | D, specific
- `how to actually make money on tiktok shop (full breakdown)` | start here | C, broad
- `from $0 to your first $1k in tiktok shop commission (step by step)` | first 1k | A, broad

## High-ticket sales

- `how i closed $[X] in one month on the phone (full breakdown)` | one script | A, specific
- `the objection line that saved my worst call (copy me)` | say this instead | C, specific
- `stop pitching on the first call, this is what closes (proof)` | slow down | D, broad
- `watch me take a real sales call from start to close (step by step)` | live close | B, broad

## Airbnb

- `how my first rental made $[X] in its first month (full breakdown)` | one listing | A, specific
- `the pricing setting that filled my calendar (step by step)` | booked out | C, specific
- `don't buy property for airbnb, do this first (proof)` | no mortgage | D, broad

## Make money online

- `how i made my first $[X] online in 30 days (full breakdown)` | first month | A, specific
- `the side hustle that actually paid me (step by step)` | it paid | C, broad
- `stop buying courses, do this one thing first (proof)` | skip the course | D, broad
