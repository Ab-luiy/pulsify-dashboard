---
type: synthesis
tags: [funnel, scaling, offer, sales, product]
sources: [[wiki/synthesis/dashboards-audit-and-portal-strategy-2026-07-12]], [[wiki/synthesis/client-dashboard-redesign-spec-2026-07-12]], [[wiki/synthesis/client-portal-product-spec]], [[wiki/synthesis/payment-onboarding-automation-spec]], [[wiki/synthesis/integrations-hub-spec]], [[wiki/content-engine/sequence-carousel-design-system]], [[wiki/content-engine/reel-capture-to-content-engine]]]
created: 2026-07-13
updated: 2026-07-13
---

# Pulsify portal, the master architecture

The founder's full vision for the productized system (voice brief, 2026-07-13). One premium portal that holds everything a client needs natively, wears a CRM-grade interface, and runs on a second brain we build for each client. Two tiers: what the client sees, and the operator god-view behind it. This page is the north star the dashboard, the studio, the integrations hub, and the onboarding automation all converge on. It says what to build, what already exists, and in what order.

## The one-line vision

Not a garage startup portal. A premium, dynamic, fashionable interface with logins, a CRM spine, connected tools, and a per-client knowledge base, so a client logs in and everything about their business and their content lives in one place, feeding both our work and their own AI.

## The two-tier model

- **Client portal (user view).** What the client sees and runs their business from. Starts near-empty on day one and fills through onboarding and connected tools. Premium, branded, user-friendly.
- **Operator console (the god-view).** The ultimate portal. The operator can open any client's account and see everything, the way platform support teams can, invisibly to the client. Every impersonation action is logged to an audit trail, for trust and team accountability. Plus a cross-client rollup: MRR, at-risk clients, whose content is slipping. This is how Pulsify runs many clients at once.

Both tiers exist partially today (`/admin` operator console + the client dashboard). The new work is full impersonation with an audit log, and the cross-client rollup.

## The client brain (the differentiator, build this)

The single most distinctive layer. Each client gets a structured, living knowledge base, the productized version of how the founder uses Obsidian plus an AI: ICP, offer, unique mechanism, stories, tone of voice, proof library, lifestyle, and everything we already know about them. It does two jobs:

1. It feeds our generators (sequences, carousels, reels, bio) with real context and real proof, so output is on-brand and specific, not generic.
2. It exports as a clean context package the client feeds into their own AI. We teach them the context-reader method (the same method the founder uses here), so they can run their own AI with full information. This respects the no-our-keys decision and scales.

The brain is populated fast at onboarding (see below), not typed in from scratch. That is what solves the empty-portal problem.

## Onboarding, minutes not days

Signing should trigger everything. Target flow:

```
Client signs (PandaDoc / DocuSign)  -> contract webhook
        v
Payment lands (Stripe / Fanbasis / Whop) OR operator Mark-paid
        v  fires, fail-soft:
1. Auto-create portal login + set-password link
2. Guided onboarding wizard, not a blank portal:
     - one voice note explaining the whole offer (already in the onboarding doc)
     - connect accounts (integration center)
     - a short intake form (the live 30-question Google Form)
3. The voice note is transcribed and auto-populates the client brain (offer, mechanism, tone, stories)
4. Connected accounts backfill the metrics sections automatically
5. Operator alerted; game-plan call within 72h against an already-populated portal
```

The key upgrade over the current spec: the voice note and connected accounts auto-fill the brain and the sections, so the portal is warm on first login, not empty. Onboarding automation is already ~60% built (payment event, Mark-paid, portal token, pipeline advance, the email rail parked until the first domain); this vision adds the contract webhook, the wizard, and the voice-note-to-brain step.

### The onboarding page is its own designed surface

Onboarding is a separate, premium, animated page, not a section inside the portal. It fades in and out, it looks beautiful, and it walks the client through connecting everything themselves with guidance. Its job is to collect the prerequisites and make the connections:

- **Prerequisites:** their offer (the voice note), their ICP if they have one, and market research where they need it (we can run the research when they do not).
- **Connections, made here, wired to the portal automatically.** This is the crucial mechanic. When the client connects an account during onboarding, the connection persists to their portal, so the moment they finish registering and log in, the sections are already live and populated. They connect once, on the onboarding page, and never have to reconnect inside the portal. In practice this is OAuth (or credential login) at onboarding time, tokens stored against their account, and every section reads from those tokens on first load.
- **What they connect:** YouTube and Instagram (log in with their credentials), Kit, Whop, Skool, Fanbasis, and Stripe where it applies. We teach them to connect each one, so onboarding doubles as the setup tutorial.

So the sequence is: sign, register, land on the animated onboarding page, drop the offer voice note, connect the accounts with guidance, and arrive in a portal that is already full. The onboarding page belongs to the operator side and provisions the client portal; the client portal only ever shows a finished, populated workspace.

## The integration center (connect everything, route to sections)

One connect hub, many destinations. The center is the plumbing; each connection feeds its home section, never all on one page.

| Connect | Feeds |
|---|---|
| Stripe, Fanbasis, Whop, Skool | Revenue |
| Kit, email | Email composer (draft in portal, send through Kit, select leads or tags) |
| YouTube | Video metrics gallery (pull stats, never upload) |
| Instagram | Reels gallery, story-sequence gallery, carousels |
| Instagram DMs / ManyChat | DM funnel and trigger-word routing |
| Zoom, Calendar (Cal.com / Google) | Bookings and calls |
| Slack, Discord | Team alerts and community |

The integrations hub UI, D1 tables, signed webhooks, and Discord alerts already exist (hub I1). The new work is the section routing and the specific pulls (YouTube stats, IG media, ManyChat).

Decision to make: Instagram DMs directly if API access is granted, otherwise connect ManyChat as the DM layer.

## The sections (what the client experiences)

Every section is a media-grade experience, not a table.

- **Revenue.** Live from connected rails. Cash, goal tracker, payment history.
- **YouTube metrics.** A gallery of every posted video by thumbnail, playable in-portal, each expandable to its own retention chart (click-in, click-off), CTR, and full log. Beautiful, dynamic, not a list of titles.
- **Instagram, reels.** A reels gallery, sorted by today and by date, each expandable into a bigger window with its stats.
- **Instagram, story sequences.** All sequences, expandable to a full page, with drop-off charts, completion, DMs, and the diagnosis (already built in the studio metrics).
- **Instagram, carousels.** The live carousels with saves and reach.
- **The work section.** Where the client picks what to work on. Not our generator running on our keys. They choose a piece, the portal hands them the exact context package from their brain, and they run it on their own AI. Plus the studio design direction so the output is designed, not just written.
- **Bookings and calls.** From Calendar and Zoom.
- **DMs.** The trigger-word funnel from ManyChat or the IG API.

Charts everywhere they help: retention curves, drop-off bars, reach donuts, pies. The design bar is the Trakyo system already locked.

## Outreach tracking and the warm-lead follow-up engine (mostly built)

Good news: the outreach tracking the founder wants already ships and is live. Every sent landing page has a per-prospect URL, and the system logs views, watch depth, watch time, IP, geo, and fires a Discord alert when someone watches past 75%. Off-page assets (a Google Doc, a Gamma) get tracked through `/a/{token}` redirect links. It is currently buried in the `/admin` Pages-sent board.

The new layer to add: turn that signal into a follow-up engine. When a prospect views a sent page, score them warm and surface them in a prioritized follow-up queue, so the team hits viewers harder. Not a hard rule that we only follow up with viewers, a prioritization signal that makes the follow-up sharper.

## Distinctive layers to add (my recommendations)

- **The client brain and its context-reader export.** Covered above. This is the moat. Nobody else hands a coaching client a second brain any AI can read.
- **The proof vault.** A structured, tagged library of each client's student results and screenshots, collected once at onboarding, that auto-feeds the design-system generators (which need real artifacts to place). Solves the "where does the proof come from" gap in the design system.
- **The pulse feed.** One activity stream across all connected tools: a payment landed, a call booked, a DM hit the trigger word, a reel crossed a threshold. The heartbeat screen.
- **The Action Engine, proactive.** The portal tells the client what to do next, not just what happened: your value-driven sequence is leaking at slide 2, here is the fix. This already exists in the studio diagnosis; make it portal-wide and push it.
- **Client health score.** A churn-risk signal per client in the god-view: are they posting, are metrics improving, are they logging in. This is how the operator protects revenue at scale.
- **White-label feel.** The portal wears the client's brand where it matters, so it reads as their premium system, not a generic tool.
- **The audit trail on impersonation.** Every god-view action logged. Trust and safety, and it is the difference between a real platform and a liability.

## What exists vs what is new

**Built and live:** the client dashboard (login, studio with generation and review, metrics with drop-off diagnosis), the integrations hub (UI, D1, signed webhooks, Discord alerts, Mark-paid onboarding trigger), the operator console `/admin`, outreach view/watch/IP tracking and off-page asset tracking, the Trakyo design system, the sequence and carousel design system, the reel engine (preview). CRM cross-browser sync and per-lead URLs.

**New:** the client brain plus context-reader export, the onboarding wizard plus voice-note-to-brain, the contract webhook, full impersonation plus audit trail, the cross-client rollup and health score, the section routing for each integration, the YouTube and IG media galleries, the warm-lead follow-up engine, the proof vault, the pulse feed.

## Recommended build order

1. **The client brain plus onboarding wizard.** It is the differentiator and it makes every other section useful by filling it. Voice note to transcript to structured brain. Highest leverage.
2. **Surface and extend the outreach tracking into a warm-lead follow-up queue.** Cheap, high impact, already 80 percent there.
3. **Integration section routing**, starting with the ones that need no new API drama: Stripe or Fanbasis to Revenue, Kit to the email composer, Cal.com to bookings.
4. **The media galleries**, YouTube first (stats pull, playable gallery, per-video charts), then IG reels and stories.
5. **The god-view upgrades**, impersonation plus audit, then the cross-client rollup and health score.
6. **The proof vault and the pulse feed** as the polish layer.

## Open decisions (founder)

- Instagram DMs directly, or ManyChat as the DM layer.
- The payment rail standard (still open, gates the webhook path; Mark-paid works regardless).
- The contract tool (PandaDoc vs DocuSign) and whether onboarding connects to the client portal or the operator dashboard. Recommendation: the operator dashboard owns onboarding and provisions the client portal, so the client portal only ever shows a finished, populated workspace.
- The email domain (still parked until the first client; it gates the fully-automatic onboarding email).

## Source trail

- Founder voice brief 2026-07-13 (unified portal, outreach tracking, two-tier god-view, empty-portal-fills-from-onboarding, integration center routing to sections, media galleries, the work/context-handoff section, onboarding automation on signing).
- Grounded against: [[project_funnel_view_tracking]] (tracking is built), [[synthesis/payment-onboarding-automation-spec]] (onboarding ~60% built, voice-note intake exists), [[synthesis/integrations-hub-spec]], [[synthesis/dashboards-audit-and-portal-strategy-2026-07-12]].
