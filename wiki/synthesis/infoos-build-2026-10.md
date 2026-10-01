---
type: synthesis
tags: [funnel, sales, scaling]
sources: [[synthesis/infoos-placement-map]], [[synthesis/dustin-varano-video-as-brief]], [[frameworks/call-funnel-framework]], [[synthesis/soowei-goh-extractions/05-industry-predictions-blueprint]]
created: 2026-10-01
updated: 2026-10-01
---

# InfoOS build: what shipped and how the lead score works

The founder asked on 2026-09-30 to build the lead score "super accurately" with no bulky text, an expansion to see every detail, a pipeline per lead, to keep Dustin Varano's globe, clocks and page builder, and to build the censor toggle and the rest of the mapped InfoOS features ([[synthesis/infoos-placement-map]]). This page records what was built, where it lives, how the score is computed, and what is still open. Ticket pulsify-saas #39.

## Why this matters for Pulsify

The offer promises a dashboard that says what is broken and who to call. Dustin's InfoOS shows the back half of an info business (leads, calls, cash); Pulsify already makes the content. Putting his back half on our data means one system runs from the video to the closed deal, which is the edge in [[synthesis/sell-ready-plan-2026-09-30]].

## How the lead score works

The score is the chance a lead buys, shown on a points scale: 50 points is a 1 in 20 chance and every 10 points doubles the odds (the credit-scorecard convention). The points behind each reason add up exactly to the score, and the expanded lead shows every one of them.

It is built in three parts:

1. Where they are. The share of people at that step who went on to buy. Each client's own funnel replaces the starting value once it has people who reached the step 30 or more days ago. Before that it leans on all Pulsify funnels, then on documented numbers: 12% of booked calls buy (60% show times 20% close, the low ends of Jeremy Haynes' ranges in [[frameworks/call-funnel-framework]]), 20% of calls held close, 3.5% of opt-ins book (SooWei Goh). Where the vault has no number (share of applicants who book, share of visitors who opt in) the screen labels it a starting assumption.
2. How they behaved compared with everyone else at the same step: video watched, time on the page, return visits on different days, proof read, scroll, button clicks, arriving from the client's YouTube, several videos, a phone number, a suspicious email. Compared with the step's average, so a typical applicant gets no bonus. Until a client's own outcomes are fitted, behaviour moves the odds at most about 7x, the documented size of being pre-sold (close rate 20-30% to 40-60% with a pre-frame, show rate 40-50% to 60-70% with hammer them).
3. What happened: answers marked not a fit, a cancelled call, a no-show, a pitch that didn't close, and days gone quiet.

Every night the sync Worker refits each client's weights on their own matured leads, with the starting weights as the prior, so they move only as far as the client's outcomes justify (at least 30 leads and 3 buyers). Bands: Hot 65+ (about 13%+ chance), Warm 50+, Cool 35+, Cold below. Scores are snapshotted so the Leads screen can later show how often past hot leads really bought. Nothing in the score is written by AI.

## What shipped

Live on pulsify-ai.com since 2026-09-30 (Pages c28a8219, Worker 50640f69, migrations 0045 and 0046):

- Leads hub in the client portal: Pipeline (one line per lead with score, stage dots, status and next move; tap for the full breakdown, the lead's own pipeline, facts, money, answers and journey), Visitors (everyone on the page, named or anonymous, with the globe), Calls (next two weeks with a confirmed flag, a month coloured by outcome, waiting-on-a-form list), Conversations (the hand-kept register).
- Post-call form with "arrived pre-sold?", deal value and payment type; it moves the lead along their pipeline and feeds the score.
- Hot-lead alert to the client's bell and the operator's, once per lead per week, only for leads still needing a call.
- Censor switch in both headers, blurring names, contact details, message text and money; world clocks in both headers.
- Tracker additions: visit location (globe), rage clicks, one id per page load. Booking webhooks now record cancellations, the booking time and the call link.

Live since 2026-10-01 (Pages 5d7e8271, Worker 3504635c, pulsify-saas claude/infoos-build 731d481):

- Performance: Funnel (live tiles, sources down to cash, globe, qualify split, funnel against target), Video (plays, depth, finished, time to press play, retention curve), Applications (every answer with book and buy rates, a not-a-fit switch that feeds the score), Links (tracked links for a bio, story, email or ad, with clicks to cash).
- Pages: page stats, page flow, and a builder that edits the locked template's words, video, form and proof with a live preview where clicking text jumps to its field ([[playbooks/landing-page-fill-in-playbook]]).
- Home: Monthly report (Save PDF, forecast beside actuals; forecasts set by the operator), call-day nudge to post a result story before calls, do-the-fix buttons on every fix.
- Ask in the portal header: answers computed from the workspace's rows; with a model key, Claude only rewords numbers it was handed.
- Team: the client's own setters and closers with 30-day numbers, booking links, end-of-day and post-set forms, a missing-form warning; Payments gets Commissions with Mark paid and flags.
- Integrations: recent problems in plain words and a check once the first payment or booking arrives.
- Operator console: Client funnels shows every one of these views for any client, plus the report with forecast editing and Ask; client tiles on Overview show each funnel score.

## Connections

- [[synthesis/infoos-placement-map]] — where each InfoOS screen was placed
- [[synthesis/dustin-varano-video-as-brief]] — build order and the reasoning per feature
- [[synthesis/cash-by-video-spec]] — the first InfoOS piece, live since 2026-09-29
- [[frameworks/call-funnel-framework]] — the documented show and close rates the score starts from

## Open questions / gaps

- No client has enough outcomes yet for a fitted model; every score today runs on starting weights and the client's own step rates. The accuracy readout appears once scores are 30 days old.
- Two starting assumptions have no vault source (4 in 10 applicants book, 1 in 20 visitors opts in or applies); they are replaced by each client's own numbers as data arrives.
- The founder's own funnel is still not on our tracker (YouTube to Instagram to DM), so none of this runs on his traffic yet.
- AI phrasing in Ask is off until a model key is set, by the founder's choice.

## Source trail

- pulsify-saas branch claude/infoos-build; Pulsify-Brain output/standard-preview functions/_shared/{lead-score,lead-people,lead-models,lead-alerts,lead-calls,funnel-analytics,monthly-report,ask,team,call-day,integration-notes}.js and their API files; tests/lead-score.test.mjs.
- Founder messages 2026-09-30; screenshots in raw-sources/inspiration/dustin-varano-infoos/screenshots/.
