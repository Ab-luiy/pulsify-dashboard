---
type: synthesis
tags: [content, funnel, sales, scaling]
sources: [[raw-sources/inspiration/dustin-varano-infoos/transcript]], [[raw-sources/inspiration/dustin-varano-infoos/README]]
created: 2026-09-29
updated: 2026-09-29
---

# Dustin Varano's InfoOS video, read as a brief to Pulsify

The founder asked for Dustin Varano's InfoOS video to be read from 1:52 onward as if Dustin were briefing us directly on what to build and how to run delivery, in the order he says it. This page does that: each block is his instruction, where Pulsify stands today (checked in code on 2026-09-29), and what we apply with our own twist. The screen-by-screen inventory already lives in [[synthesis/dustin-varano-infoos-teardown]]; this page is the chronological action version and adds the operating lessons from his student call, which the teardown skipped. His revenue figures are his claims, the on-screen numbers are demo data by his own account.

## Why this matters for Pulsify

Founder rule (2026-09-29): when an operator in our space shows how they run info offers and the software behind it, we take it and put our twist on it. Dustin sells to our buyers, runs YouTube as his lead engine, and is building the backend half of what the Pulsify portal is becoming. Most of the value is in pillar 3 (funnel and sales backend) plus two delivery habits that feed pillar 1 (content): ranking videos by cash, and posting result stories on call days.

## Core mechanics: the brief, in his order

### 1:52-2:30 The lead that never filled the form
He: a lead who skips qualification can still be the best lead on the page, so build something that notices them.
Us: the landing tracker gives every visitor a persistent id on first load, logs page views before any opt-in, and stamps the email onto those earlier anonymous events when they submit (`attachIdentityToEvents` in `functions/event.js`). The anonymous-visitor part exists.

### 2:32-3:33 What to record on the page
He: time active on the page, scroll behavior including full-page scrolls up and down, whether they looked at the testimonials, full VSL watch, all collected before we know who they are.
Us: VSL tracking is already deep. `js/funnel-integrations.js` sends play, pause, seeks, percent milestones, watch seconds every 5 seconds and the second-by-second watch vector on exit. We record none of: active time, scroll depth, full-page scroll count, proof section seen, rage clicks.
Apply: four new signals in the tracker: active seconds (tab visible, interaction in the last 30s), max scroll depth, full-page scroll count, and proof seen (proof section in view 3s+). Blocker: the tracker belongs to the locked landing-page standard, so this needs the founder's yes.

### 3:33-4:04 Context makes AI better
He: the more data the system is fed, the better its answers.
Us: stronger than him on paper. He grounds his AI in a SOP library written in a month. We have the vault, the per-client brain in the portal (identity, offer, ICP, story, voice, proof, funnel, do-not; `functions/api/client-brain.js`) and semantic search over it (`functions/_shared/search.js`).
Apply: every AI feature below reads the client's brain, the relevant vault playbook and the client's live numbers. Nothing generic.

### 4:04-5:34 The high-intent call
He: compare each lead's behavior to past buyers of the same offer and flag the ones who behave like buyers, even with zero qualification.
Us: one crude version: `maybeAlertHotWatch` sends a Discord "Hot watch signal" when someone passes 75% of the VSL. One signal, no score, no comparison.
Apply: a 0-100 intent score per visitor, plain rules first (VSL %, active time, full scrolls, proof seen, return visits, whether the source video has produced cash before). Rules first because a small creator has 3 to 10 buyers, and matching against 5 buyers is noise. Twist he can't easily copy: starting weights pooled from buyers across all our clients in the same niches, then each client's own buyers take over once there are 30 or more (a starting number, not a measured one). His own story shows the limit: the setter still qualified the lead by DM. The score decides who gets called first. It qualifies nobody.

### 5:34-6:05 The alert
He: the moment a high-intent lead opts in, post them to the setter channel with an AI summary and "call today".
Us: Discord and in-app alerts exist; they say "hit 75% watched" plus an email.
Apply: the opt-in alert carries a one-line AI read, the score, the source video and the next action. Without setters it goes to the creator, or to us if we run their DMs. Client rule: hot lead gets a DM within the hour and a call the same day.

### 6:05-6:36 Source video on every lead
He: know the exact YouTube video every lead came from.
Us: backend landed 2026-09-29 (commit 5180c5cd, pulsify-saas #36, [[synthesis/cash-by-video-spec]]); portal screen in progress in another session.
Apply: also show the source video in the lead alert and the lead profile.

### 6:36-7:06 Closer auto-assignment
He: give the call to the closer who most recently closed the same offer from the same video.
Apply: park until a client has two or more closers. Then: same video and offer, most recent close wins, else whoever is free. No AI needed.

### 7:37-9:38 Built for himself first
He: built for his own offers, under 10 users, not sold until it was right.
Us: zero paying clients on the live database (2026-09-29).
Apply: run everything on the founder's own funnel first (open question in the cash-by-video spec). That gives real numbers before the first client and a real catch to tell in stories.

### 9:38-10:39 Dashboard and monthly report
He: date pills, a lead-alert toggle for whoever has the tab open, and a one-click monthly report showing every number against goal, because operators must show clients how much they are doing.
Us: dashboard and weekly metrics (`functions/api/metrics-weekly.js`); no monthly report, no per-step goals.
Apply: monthly report with Save PDF per client. Twist: it also lists what we shipped that month (videos, sequences, pages), the top video by cash, and next month's one fix. Step goals only where the vault documents a benchmark; none invented.

### 10:39 Sub-accounts
Us: operator and client separation with impersonation exists. Nothing to add.

### 11:09-13:43 Ask OS
He: Claude over the client's live data, grounded in the SOPs. Three levels: counts, best source by lead quality, full traffic-to-cash breakdown with the leaks and how to fix them. It must know good numbers from bad.
Us: the parts exist (`functions/_shared/llm.js` Claude first, Gemini fallback; brain search; all numbers in D1). No question box.
Apply: second, after the fix list. Small creators won't ask good questions, and his own next version pushes answers instead of waiting. Every answer shows the numbers it used, names the playbook rule applied, and says "not enough data yet" on small samples.

### 14:13-16:15 SOP library
He: two sides (getting clients, running the backend), a help page per software screen so it is self-serve, SOPs deep enough to ground the AI. At 16:15: the model can't be a course, it is case by case, 1:1 only.
Us: the vault is deeper, but clients see none of it. The 1:1 point matches our default offer.
Apply: a short help page per portal screen (what it shows, what to do when a number is low). The same-day SOP rule from The Keys already stands ([[playbooks/pulsify-delivery-sop]]).

### 16:46-31:02 The student call (delivery lessons)
- 17:47 Financing fees are high with any provider; push paid in full, financing last. Matches the founder's 2026-07-28 rule that the upfront fee is non-negotiable.
- 18:17 Fulfillment must be dialed before pushing more calls.
- 19:48 One universal SOP page for everyone; each client only duplicates a page for their own checklists, so updates land everywhere. Our vault plus `clients/` already works this way; keep the portal the same.
- 20:49 The student's first win was tracking set from day one. Apply: tracking goes live inside the 24-hour onboarding ([[playbooks/prospect-signed-onboarding]]).
- 21:19 The creator can't add description links because of an old channel strike (his claim). Apply: onboarding checks that the channel can post clickable links, since cash by video depends on it.
- 22:20 "I rank videos by cash collected, not views." That is #36.
- 22:50-23:52 When to add a VSL landing page: post the flywheel video, watch the calls; if people arrive curious and don't know the offer, add the VSL page. Apply: a post-call question "arrived pre-sold: yes / partly / no"; when "no" crosses a threshold, the fix list recommends the VSL page. This defines "when warranted" in our funnel doctrine.
- 24:23 The post-booking page qualifies hard on everything except price; pitched leads often come back later.
- 24:53-25:24 After a near-close, post one or two results on IG stories right away. The student posts a result story sequence on every day with calls and says it lifts bookings and closes. Apply (highest-rated item from the call): a call-day nudge. When a client has calls today, the portal says so and hands them a drafted result sequence from their proof bank via the story-sequence generator. Depends on the client's calendar being connected; per-client Calendly sign-in is parked with #15 until the first client pays.
- 25:54 YouTube, IG and calls re-engage each other.
- 26:25-27:26 One or two good videos a week beat daily; raw with the least editing converts best; short-form is hard to make and brings worse leads. Matches our doctrine and the reels-out decision.
- 27:56-29:29 The "everyone already knows this" fear: you don't need new information, present it simply, your small differences are the value, and 0 to $30k makes you top 1%. Apply: coaching copy for Growth's YouTube ideation when a client stalls.
- 30:01, 31:32 Forecasts: he says he told the student at $0 the offer would do about $25k in month one; mid-month it was at $21k heading to about $27k. He frames honest forecasts as a trust signal. Apply: record a forecast per client at signing, show forecast vs actual in the monthly report. Founder decision needed (see gaps).

### 32:03-36:07 Funnels
He: every page hosted in the app, built with Claude or imported as HTML, an AI editor on the live page, opt-in popups built in, tracking injected automatically with no UTM setup; screenshot any landing page, one prompt, import the HTML.
Us: collides with the locked [[synthesis/landing-page-standard]].
Apply: a "bring your own page" tracker, one script tag a client pastes into the page they already have, giving it our visitor id, watch tracking and video tags without redesigning anything. Page builder and AI editor stay parked unless the standard is reopened. His two-step opt-in (who are you, then contact details) is worth testing only inside the standard.

### 36:07-39:40 Analytics
He: conversion against target at each step; every visitor with an AI read, a quality score and the full journey; tracking links from clicks to cash; a VSL tab (plays, completion, average watch, time to first play, retention curve); a Typeform tab where you set which answers count as qualified; returning visitors merged to the top; phone and email validity checks. At 37:37: optimize for the ICP, not views; a 500-view video with $20k cash is the one to remake.
Us: per-prospect watch drill-down exists, and the watch vector plus ready/play events mean the retention curve and time to first play need a screen, not new tracking.
Apply: VSL retention curve; returning-visitor merge; email domain and phone format checks on opt-in so alerts don't chase fake numbers; one "set qualification" rule so "qualified" means the same thing everywhere. Use his 37:37 line in client education, it is our position.

### 39:40-45:17 CRM and payments
He: pipeline statuses, calls calendar colored by outcome, a lead drawer with the whole journey to payment; processors connected, and crypto, wire, Zelle or Cash App read from the closer's note ("PIF USDC ETH") and booked automatically.
Us: pipeline, bookings, Stripe, Whop, manual payments and payment matching exist. No note reading.
Apply: adopt his status list, above all the two money buckets "qualified didn't book" and "pitched didn't close", which feed follow-up and the call-day nudge. Payments: a plain-words box ("PIF 6k USDC") that fills amount, method and plan type, with one click to confirm. He books with no human check; we keep the click because a wrong cash figure corrupts the client report, commissions and cash by video at once.

### 45:17-46:18 Email
Skip the Kit tab. Take one rule: the chosen date range stays when switching tabs.

### 46:18-51:23 Sales team
He: roster, per-rep numbers, AI team summary, submission log, form compliance (calls vs post-call forms filed), in-app post-set, post-call and EOD forms, commissions per pay period with mark paid, revenue-vs-cash mismatch flags, installment commissions, a short tracked link per setter.
Us: payout calculator only.
Apply now: the post-call form, even for solo creators (outcome, pre-sold, main objection, follow-up date), because it feeds the VSL trigger, the money buckets and the fix list. The rest waits for a client with a team; per-setter links are then nearly free on our existing short links.

### 51:23-52:24 Settings
He: integrations, API tokens for any tool, display currency at the day's rate, time zone deciding the pay period, a green check once a real payment arrives.
Us: integrations hub and Push API keys exist.
Apply: the green check after the first real payment, as end-to-end proof the pipe works.

### The story sequence as content (1:52-7:30)
He says it was his most engaged story sequence and most DMs from a story. Format: one real deal told through what the system caught. Apply: once the founder's own funnel runs the tracking, the first real catch becomes a Pulsify story sequence ([[frameworks/story-sequence-system]]), told with the numbers and the screen. Never before a real catch exists.

### 52:24-54:26 Next version
He: agents watching funnel and pipeline around the clock; a home page with a score, "sold but not collected", and "what to fix, in order" ranked by dollars with a button to the metric.
Us: this is the Action Engine from our own dashboard vision.
Apply: drop the agent names. Each fix card carries the dollars at stake, the fix from our playbook, and a button that does the fix (drafts the reminder sequence, the story sequence, the video), not only a jump to the metric. Plus a "sold but not collected" figure from payment plans.

### 54:26-end The pitch
1:1 only, application form, vets everyone himself, lead magnet. Covered in [[synthesis/dustin-varano-the-keys]].

## What the founder's screenshots added (2026-09-29)

The founder captured 51 screens from the video (mapped in `raw-sources/inspiration/dustin-varano-infoos/README.md`) and asked us to replicate the design sense and take every element we lack.

**The design moves.** Near-black canvas with a faint grid texture; cards one shade lighter with hairline borders and no heavy shadow; a clean sans for UI plus a serif italic for the logo, section titles ("Pipeline", "Post-Call Outcomes", "September 2026", "Post-Set Form") and the Ask empty state; tiny uppercase labels over big numbers; color only on numbers that mean something (green money, amber warning, red bad); every block has a title and one plain line saying what it shows; one filter bar on every data page (range preset, dates, source filter, reset, "Updated at", Refresh) whose range carries across tabs; tinted status pills; honest microcopy ("Double-check anything important", "AI writes the words; InfoOS computes the numbers", "computed from the numbers beside it, never generated"). The next version moves to a light theme close to ours.

**The fix-card math (readable in the next-version screens).** Each card: tag (risk or opportunity), owner section, the step and its rate ("Page Visit to Opt-In View: 39.9%"), "7,498 people stop here. Reaching the 45.0% target would add 9 deals", then "How: 634 more people through this step, converted at your existing downstream rates, at $4,850 AOV", the dollar figure, and a "See where they drop" button. So the dollars at stake are arithmetic: extra people at the target rate, times the existing conversion from that step to a close, times average order value. No AI in the number. Risk cards use the same idea ("$117,270 sold but not collected: 67.3% collected, 43 of 74 deals on a plan"; "52 confirmed calls never happened: at your close rate those seats were worth $25,659").

**Elements we don't have.** Home: health score graded against targets and weighted by money, sold-but-not-collected, today vs 29-day average with a "normal day" band, step grades (A to C per funnel step, square-root scaled funnel), field-by-field application drop-off, where booked calls went (won, didn't buy, no-show, cancelled, rescheduled), value per visitor, lead, application, booked call and show. Leads: a live visitor feed including anonymous visitors, warm/hot score with its reasons listed, AI read that ends in an instruction, field-level journey with button text, return-visitor merge, email and phone checks. Funnels: page-flow view per funnel, segmented thank-you pages by answer, dedicated no-show and post-booking pages. Calls: colored calls calendar with outcome legend, upcoming calls with a confirmed flag, day popover opening the call link. Lead drawer: source chip, payment type (PIF, plan, in-house finance, Fanbasis), plan progress bar (collected of total), post-close tasks (contract, onboard, expiry). Chrome: Censor toggle that blurs private data for screen recording, plain-English integration errors, time-zone "inherited, not set" warning, recent-changes log. Team tools and commissions as described above.

**We have and he doesn't.** The whole front half of the business: YouTube creation and thumbnails, story sequences, copywriter, the client brain, onboarding. His app is backend only. Bringing his backend into ours makes ours the full content, offer and funnel system.

## How Pulsify uses this

Founder decisions 2026-09-29: look A (his design moves in our own look, no reskin), yes to changing the tracker script, yes to forecasts for signed clients, yes to running everything on his own funnel first. His funnel had no page on our tracker (it runs YouTube -> Instagram -> DM -> call), so a Pulsify homepage on our tracker comes first for that.

Build order after the screenshots (item 2 moved up because it is arithmetic on data we already collect):
1. Cash by video. Live 2026-09-29 (pulsify-saas #36).
2. Client home fix list with the dollar math, health score, last 24 hours vs normal, worth per step. Built 2026-09-29 (pulsify-saas #37, `functions/_shared/funnel-health.js`).
3. Four new page signals, the intent score and the richer opt-in alert.
4. Call-day story nudge.
5. Post-call form with the pre-sold question.
6. Do-the-fix buttons on every fix card, then the Ask box, then the monthly report.

Waits for a client with a sales team: closer assignment, team forms beyond post-call, compliance, commissions, per-setter links. Skipped: Kit tab, agent personas, the page builder (unless the standard reopens).

## Connections

- [[synthesis/dustin-varano-infoos-teardown]] — the screen inventory this page turns into actions
- [[synthesis/cash-by-video-spec]] — item 1, backend shipped
- [[synthesis/growth-section-plan-2026-09-25]] — story sequences are Growth's second priority; the call-day nudge wires them to a trigger
- [[synthesis/landing-page-standard]] — why the tracker change and page builder need the founder
- [[frameworks/story-sequence-system]] — the result stories and the future catch story
- [[people/dustin-varano]] — source person

## Open questions / gaps

- Founder: may we change the tracker script inside the locked landing-page standard (signals, bring-your-own-page tag)?
- Founder: do we state a revenue forecast to signed clients? The horizon-note rule bans timeline promises in prospect assets; a forecast after signing is a different context but the same risk.
- Founder: does his own funnel go first?
- The "AI compared him to past buyers" method is never shown. Our version is rules first until data says more.
- His forecast was checked mid-month (21k heading to 27k against a 25k call), so "perfectly predicted" is his framing.
- The lifestyle framing (Miami, Monaco, Dubai) wraps the whole video. Structure kept, backdrop dropped.
- The founder's own screenshots of the video are pending in `raw-sources/inspiration/dustin-varano-infoos/screenshots/`; they may add screens this page lacks.

## Source trail

- `raw-sources/inspiration/dustin-varano-infoos/transcript.txt` (YouTube auto-captions, pulled 2026-09-29).
- `raw-sources/inspiration/dustin-varano-infoos/` frames 01-22 and README.
- Our side, read 2026-09-29: `output/standard-preview/js/funnel-integrations.js`, `functions/event.js` (`maybeAlertHotWatch`, `attachIdentityToEvents`), `functions/_shared/llm.js`, `functions/_shared/search.js`, `functions/api/{client-brain,api-keys,metrics-weekly,studio-sequences}.js`, commit 5180c5cd.
