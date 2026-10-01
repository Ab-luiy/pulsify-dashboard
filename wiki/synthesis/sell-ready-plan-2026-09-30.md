---
type: synthesis
tags: [offer, funnel, sales, scaling]
sources: [[synthesis/dustin-varano-video-as-brief]], [[synthesis/growth-section-plan-2026-09-25]], [[playbooks/pulsify-offer-v1]], [[concepts/pulse-system-mechanism]]
created: 2026-09-30
updated: 2026-09-30
---

# Sell-ready plan: what is built, what is missing, and the edge

The founder asked on 2026-09-30 to stop spending the workflow on design and get the product ready to sell with a competitive advantage. This page audits what a paying client gets today against the offer, names the edge over InfoOS-style tools and content agencies, and ranks what is left by how much it helps close and keep a client. Checked against the code, the ticket board and production settings on 2026-09-30.

## Why this matters for Pulsify

The offer ([[playbooks/pulsify-offer-v1]]) promises the Pulse System: content engine, funnel stack, sales co-pilot and a dashboard that says what is broken and how to fix it. A prospect buys that after a demo on the call. Anything missing from the demo or from the first 30 days of delivery costs the sale or the renewal.

## The edge (one sentence)

Pulsify is the only system that makes the video with the client and then shows which video brought in the money: InfoOS-style tools track cash but do not make content, and content agencies make content but do not track it to cash. Every piece of the loop is already built except the last link back from cash to the next video.

## What is live today

- Client portal: onboarding form into the client brain; Overview with the funnel graded and "what to fix, in order" with the dollar math (#37); videos ranked by cash with a tracked link per video (#36); story sequences with the founder's review gate and learning from approvals and rejections; payments with matching; integrations hub; media library; performance.
- Tracking: every visit, video watch (second by second), opt-in, application, booking and payment; since 2026-09-29 also time on page, scroll depth and time on the proof section.
- Service automations: pre-call brief on every booked call, Fathom call import, weekly report drafts parked for approval.
- Operator console: every client, CRM, outreach, inbox, reviews, client brain, payouts.

## Built but not released

- **YouTube video flow** (the founder's #1 thing to dial in): guided ideation, title and thumbnail, build the video, founder review. Built on 2026-09-28/29 on branches `claude/growth-youtube` (pulsify-saas 3 commits, Brain 11 commits including migration 0044). Held back by its session; releasing it needs the founder's yes.
- **Design and funnel round** on `claude/graphite-preview`: the calmer funnel section, operator Client funnels page (any client's funnel and videos by cash), and the homepage colour placement inside the app. Waiting on the founder's look approval.

## Ranked: what is left

1. Release the YouTube video flow with the design round (both built).
2. **Demo workspace for sales calls.** A clearly labelled example workspace with realistic numbers across funnel, videos by cash, sequences and fixes, so every call ends with the product on screen, as the offer's sales process requires. Today the only live workspace has two visits.
3. **Close the loop.** "Make another like this" on the video that earned the most, opening the YouTube flow pre-filled with what worked. This is the edge made visible.
4. **Lead score and hot-lead alert** (brief item 3): who to call first, built on the tracking already collecting.
5. **Monthly report** with the founder's forecast against actual (founder approved forecasts 2026-09-29): retention and a proof asset.
6. **Calls**: calendar coloured by outcome, post-call form with "arrived pre-sold?", call-day result-story nudge.
7. Fixes: Instagram daily sync failing since 19 Sep (#25); corner toasts covering buttons inside the panel.
8. Sales team and commissions, when a client has setters and closers.

## Needs the founder (blocks a sale or delivery)

- **AI writing is off in production.** No Anthropic or Gemini key is set, by the founder's choice until a client pays upfront; drafts are copy-paste into the client's own ChatGPT. On a sales call that undercuts a $5k offer. Proposal: turn it on with a hard monthly budget cap, operator-only until the first client pays.
- **How clients pay Pulsify** (#24): pick the rail, then receipts get built.
- **Sign-in**: PropelAuth self-invite and 2FA (#5), then remove the Cloudflare Access app (#7).
- Client OAuth apps (#15) stay parked until the first client pays, as agreed.

## Open questions / gaps

- Whether the founder wants the YouTube flow released before or after the demo workspace.
- The demo workspace must be labelled as example data everywhere it appears; it can never be shown as a real client.

## Source trail

- Code and branches read 2026-09-30: pulsify-saas `claude/graphite-preview`, `origin/claude/growth-youtube`; Brain `claude/growth-youtube`; `functions/_shared/delivery-automation.js`.
- `wrangler pages secret list` (names only) for pulsify-funnels, 2026-09-30.
- Tickets #5, #7, #15, #24, #25 on Ab-luiy/pulsify-saas.
