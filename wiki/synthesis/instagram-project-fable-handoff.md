---
type: synthesis
tags: [content, instagram, funnel, offer, scaling]
sources: [[wiki/synthesis/personal-brand-harmony-master-plan]], [[wiki/synthesis/cross-creator-synthesis]], [[wiki/synthesis/portal-content-studio-spec]]
created: 2026-07-12
updated: 2026-07-12
---

# Instagram project — Fable handoff and full roadmap

Written by Fable 5 at the end of the Instagram build sprint (2026-07-11/12), as Fable access ends. This is the single page the next model (per the standing rule: Opus 4.8 xhigh thinks, Sonnet 5 / Codex builds) reads to pick up the Instagram workstream without re-deriving anything. It states what is done, what is live, what is decided (do not relitigate), and what is left, in build order.

## The one-paragraph state

The Instagram project went from a near-empty concept to a complete knowledge layer plus a live product in one sprint. Two creator corpora (Niksetting 21 videos, SooWei Goh 5 — ~124K words) are fully extracted into 34 verbatim-sourced pages. Nine canonical framework pages encode the doctrine, filtered through a laws-vs-contested-dials synthesis with all 7 contested dials founder-ratified. Two skills let any future model ingest screenshots and generate sequences at Fable-grade. Real captures (an 18-slide start-here sequence + 3 designed carousels) are broken down and folded back into the frameworks. And the client dashboard (P1-P3) is live on pulsify-funnels: clients log in, generate reviewed story sequences, and see drop-off metrics. Nothing here is speculative; every claim traces to a founder-supplied source.

## What is DONE (knowledge layer)

- **Both corpora extracted:** `wiki/synthesis/niksetting-extractions/` (24 pages) + `wiki/synthesis/soowei-goh-extractions/` (5 pages). Every claim verbatim-sourced.
- **The verdict layer:** [[synthesis/cross-creator-synthesis]] — 18 corroborated laws (canon), 7 contested dials (all ratified), single-source registers, the fusion thesis.
- **9 framework pillars:** story-sequence-system, instagram-conversion-assets, reel-format-ladder, messaging-reframe-system, proof-system, carousel-system (frameworks/); format-invention-pipeline, content-operating-rhythm (playbooks/); profile-funnel rewritten (concepts/).
- **2 people pages:** niksetting, soowei-goh (strictly source-traced).
- **2 skills:** `sequence-ingest` (screenshot pipeline + quality bar), `story-sequence-generator` (type/intent -> photo requests -> copy). Any model auto-discovers them.
- **Captures broken down:** the "New here?" start-here sequence (18 slides) + all 3 carousels; the 964k carousel's 7-type deployment matrix folded into the framework + generator.
- **Master plan:** [[synthesis/personal-brand-harmony-master-plan]] (the original strategy; pillars now substantially delivered).

## What is LIVE (product layer — client dashboard on pulsify-funnels)

- **P1 — auth + shell:** email/password login (PBKDF2 + sessions, rate-limited, operator-generated setup links from /admin), 8-section dashboard. Live + verified.
- **P2 — sequence studio:** type/intent -> goal -> proof -> per-slide photo requests -> slide copy, with a draft->review->approve gate (/admin review queue) and a paste-back field. Runs in MANUAL mode on prod (composes the full prompt; copy is written by Claude in-session — no LLM key by founder ruling). Live + verified.
- **P3 — metrics:** sequence logging with drop-off diagnostics (slide-2=hook-failed, slide-7=body-failed), cadence vs 3-floor/5-7-target, type mix; weekly report with follower/ICP deltas + dollars-per-follower off real payments. Live + verified.
- Code: `output/standard-preview/` (Cloudflare Pages `pulsify-funnels`); migrations 0011/0012/0013; the remote D1 migration ledger was repaired this sprint (was empty vs live schema).

## DECIDED — do not relitigate (founder-ratified)

1. The 7 contested dials (full text in cross-creator-synthesis): broad-TOF/niche-below; weekly originals + daily derivative clips; **engineered CTAs primary** (SooWei's no-CTA rejected); **raw clarity wins** (production-arms-race rejected); landing-page-vs-start-here is a **per-audience test** (landing page = never-fails prior); **give everything away free** (Hormozi doctrine, sell implementation/access); **instrument invisible traffic**.
2. **Proof currency = student results / receipts / transformations, NEVER lifestyle possessions.** Adopt every structure from the sources, swap the currency. This is the single most important standing rule.
3. **No Gemini/LLM key on the studio** — manual mode is by design; all sequence copy stays Claude-written in-session with full vault context.
4. **Email layer parked** until the first client's domain (Resend + verification code; code is built and degrades gracefully).
5. Highlight naming is free ("New here?" is one example; "Start"/"Clients"/"Wins" all valid).
6. Story-sequence type canon = the official 7 (value-driven, credibility, Q&A, day-in-the-life, breakdown, lifestyle, CTA) with the deployment matrix.
7. Standing project rules still in force: Codex builds / Claude specs+reviews; deploy `--branch main`; never guess (ask or verify); TLDR-in-bold; humanizer/voice guard on all copy.

## What is LEFT (build order for the next model)

**Immediate / high-value:**
1. **Validation loop (the real unlock).** Run the generator on Pulsify's own IG: generate sequences, ship them, log drop-off into P3, feed learnings back into the framework. Everything so far is theory-grade until this runs. This is the highest-leverage next move and needs the founder posting.
2. **P4 — remaining dashboard sections** (Codex, founder-gated). Now unblocked: YouTube pane (titles/thumbnails via the existing skill + publish calendar + who-converted notes), automations block (trigger-word inventory + DM routing, read-only), and the **carousel studio** (the carousel-system framework now exists, so it can generate). Recommendation: don't fire as a block — pull the automations block when a client's ManyChat is wired, YouTube pane when a client's YT starts, carousel studio anytime.

**As sources arrive:**
3. **More captures** feed `sequence-ingest`: story-sequence screenshots (visual layer), more carousels (broaden the design vocabulary), reels (the editing/format gap both corpora left thin).
4. **The appointment-setting process** is referenced across both corpora and taught in neither — a genuine missing source. If the founder can source Niksetting's setting SOP or similar, it closes the DM-to-close gap.
5. **A third creator** would migrate claims between the laws/contested tiers — the adaptability engine. Run it through `sequence-ingest` + the extraction prompt.

**Open gaps (flagged, not blocking):**
- "Save rate" is named in the sources and defined nowhere — needs a working definition or proxy.
- SooWei tool names unverified (Trackio, Sand Castles AI, PLAUD) — verify before recommending.
- Carousel save-rate metric + editing tooling uncaptured.
- No Pulsify-produced sequence/carousel exists yet — the calibration set is step 1.

## The North Star

The fusion thesis: Niksetting's conversion craft running on SooWei's AI operating system, in Pulsify's proof currency, delivered through Pulsify's infrastructure. Every trend the sources predict (lifestyle marketing dies, proof leads, missions survive AI, B2C sophistication rises) lands on the side Pulsify already occupies. The structural upgrade both corpora point at for Pulsify itself: sequence the Pulse System components as an ascension (problems bought as they break) and price the top on proof density to escape the middle squeeze.

## Source trail

- This whole workstream: `wiki/synthesis/niksetting-extractions/`, `wiki/synthesis/soowei-goh-extractions/`, the framework pages in frontmatter, the two skills, the dashboard spec, and the AGENT_CHAT / log entries dated 2026-07-11/12.
