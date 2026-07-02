---
type: playbook
tags: [funnel, outreach]
sources: [[wiki/synthesis/landing-page-standard]], [[wiki/synthesis/outreach-to-client-pipeline-roadmap]]
created: 2026-07-01
updated: 2026-07-01
---

# Landing page launch QA

The check run before an outreach landing page link goes out to a prospect. At 10-15 pages a day this has to be fast — the full list takes about three minutes per page. Anything that fails here reaches a prospect broken, and a broken free-value asset is worse than no outreach at all.

## Why this matters for Pulsify

The landing page IS the first impression — it argues "we build funnels" by being one. A leaked template token, an invented claim, or a dead form on the very page that's supposed to demonstrate competence kills the deal before the first reply.

## Per-page checks (every page, before sending)

1. **Render.** Open `/?client=<slug>` — correct name, headline, and copy for THIS prospect, no `{{TOKEN}}` text anywhere, no other prospect's content bleeding through.
2. **Both designs.** Check `?preview=canonical` and `?preview=variant-02` render clean; confirm the saved variant is the intended one.
3. **Copy rules pass** (per [[landing-page-standard]]): headline is mechanism or case-study led, not generic outcome; nothing on the page asserts a fact, number, or biography detail the creator brief doesn't support; no AI tells (negative parallelism, em-dash spray, filler transitions); sentence case; footer disclaimer present.
4. **Mobile.** One pass at phone width — no horizontal overflow, video and form usable.
5. **Video.** If a real Wistia id is set, the VSL loads and plays. If not set, the blank-player fallback shows (acceptable for cold outreach) — never a broken embed.
6. **Application.** If a Typeform is set, it loads and a test submission goes through (check Typeform's own dashboard). If not set, the blank-form skeleton shows.
7. **The link itself.** The exact URL being sent opens the right page from a clean browser profile (no cached admin state), and the slug doesn't leak anything odd (typos become permanent identity).

## Pipe checks (once per batch, not per page)

8. **Events land.** Visit a page, play the video a few seconds — confirm the visit and watch events appear for that client (campaign board or D1).
9. **Campaign board.** Every page sent today appears in `/campaigns` with its engagement zeros ready to move.
10. **No silent failures.** Check the failure log for Kit or webhook delivery errors since the last batch.

## Account prerequisites (blockers, user-side)

Real Wistia, Typeform, and Kit accounts still don't exist as of 2026-07-01. Cold outreach pages work without them (fallback states are presentable by design), but checks 5, 6, and 10 only become fully real once those accounts exist and per-client values are saved in `/settings`.

## Connections

- [[landing-page-standard]] — the structure and copy rules checks 1-3 enforce.
- [[outreach-to-client-pipeline-roadmap]] — this closes part of Phase 5 (launch QA).
- [[prospect-signed-onboarding]] — what happens after a page converts.

## Source trail

- `AGENT_CHAT.md` log 2026-06-30 through 2026-07-01 (fallback-state decisions, webhook-off-by-default for outreach volume).
