---
type: synthesis
tags: [funnel, sales, scaling, content]
sources: [[raw-sources/inspiration/dustin-varano-infoos/README]]
created: 2026-09-29
updated: 2026-09-29
---

# Dustin Varano's InfoOS: feature teardown and what Pulsify takes

A screen-by-screen inventory of InfoOS, the backend software Dustin Varano demos in his 2026-09-28 video "the exact systems inside my $1.9M/month info portfolio (full breakdown)" (56 min, https://www.youtube.com/watch?v=AxWkPGeA-S4), mapped against the Pulsify portal. Built from the full transcript plus a frame every 2 seconds of every screen-share section, with the key screens zoomed and saved to `raw-sources/inspiration/dustin-varano-infoos/`. Everything below is what the video shows. His revenue figures and the demo numbers on screen are his claims or demo data (he says so on camera), not verified facts.

## Why this matters for Pulsify

InfoOS is the funnel and sales-backend half of the business (pillar 3), sold to the same two buyers we sell to: operators running creators' offers, and offer owners. He does not sell it on its own. Access comes bundled with his 1:1 mentorship through an application form, and he says fewer than 10 accounts use it so far. That makes it a direct comparison for the Pulsify portal, and it shows where a competitor with a working sales floor thinks the money leaks.

The single idea worth stealing above all others is his YouTube metric: rank every video by cash collected, not views. He says a video with 500 views that brought in $20k is the one to remake. That is Pulsify doctrine already (inbound YouTube is the revenue engine, authority over reach), and his software makes it measurable. It also matches the "content to cash attribution" and "Action Engine" ideas in our own dashboard vision, which InfoOS's next version builds almost exactly (see the last section).

## Core mechanics: what InfoOS does, screen by screen

**The $28k story that opens the video (told as an Instagram story sequence).** A lead never filled the Typeform and never passed qualification. InfoOS tracked them as an anonymous visitor from the first page load, saw a 99% VSL watch, about 24 minutes active and repeated full-page scrolls, compared that behavior with past buyers of the same offer, and marked the lead high intent. An automation posted the lead to the setter Slack channel with an AI summary ("hot 94 prospect from top converting YouTube video... setter qualify immediately and call him today"). The setter qualified over DMs and booked a same-day call. InfoOS then auto-assigned the closer who had just closed the same offer from the same YouTube video that week. Result, per him: a $28k paid-in-full.

**Shell.** Left nav: Dashboard, Ask OS, Funnels, Analytics, YouTube, CRM, Email, Sales, Team, Commissions, Settings (tabs vary per client, some are custom builds). Sub-account switcher at the top: one sub-account per client, data never mixes. Header: an SOP Library button that opens his Notion SOPs, a Lead alerts toggle (browser alert to setters and closers when a lead comes in), and world clocks for the team's time zones.

**Dashboard.** Date range pills (Today, 7, 30, 90 days, All time). Revenue with cash collected underneath and a daily chart, Cash collected and Total leads cards with sparklines, a Lead stages strip (LP views -> submissions -> qualified -> booked calls with the step conversion between each), a sales snapshot, closer performance, top traffic sources.

**Monthly report.** One button builds a client-facing report for the selected range with Print / Save PDF: revenue, cash, closes, close rate, booked calls, average order value, the lead funnel with step rates, setter and closer performance tables, top traffic sources by campaign. Built for operators to show clients the work.

**Ask OS.** A chat box over the sub-account's live data ("Ask about your funnel, links, email, or pipeline"), running on Claude, and grounded in his SOP library. Demoed questions: qualified leads in the last 7 days; which traffic source brings the best leads (it answered by video, with views, opt-ins, applications and bookings per source); and a full funnel breakdown from traffic to cash with where the money leaks and how to fix each leak. The fix answer named three leaks with numbers (opt-in to application, qualified to booked, show rate) and SOP-based fixes (shorter form plus reminder sequence, calendar right after the qualified screen, confirmation flow with 24h and 1h reminders). Footer: "reads live data for this sub-account. Double-check anything important."

**SOP library (Notion, linked from the app).** Two columns. Creator acquisition: basic foundation (landing clients, operator framing, outbound vs inbound), personal brand (IG profile optimization, YouTube bio video, reels ideation), DM outreach (tripwire strategy, niche and lead filtering, 4 sourcing methods, outreach KPIs and rate limits, a tracking sheet, a 3-DM script: initial hook, pivot, Loom CTA, plus a Loom template), follow-up scripts, spotting gaps, objection handling, and a 2-call close (pre-discovery Fathom setup, discovery call, pre-closing context, closing call, closing template, post-close steps). Backend infrastructure: operator setup (post-signing onboarding, a client Notion template to duplicate), organic marketing (YouTube flywheel VSL, YouTube ideation, IG story sequences), foundational backend (offer fundamentals, market research, offer creation, Typeform, Close CRM, Zapier, Calendly and Fathom setup, payment processing and financing, organic launch), comprehensive backend (killer copy, Kit email, SMS via Close, WhatsApp SMS via TimelinesAI, lead magnet, VSL, landing page and post-booking page structure), sales team (structure, sales manager, appointment setter, closer, Slack setup). Plus an InfoOS software section with a setup page per app screen and a completion checklist.

**Client Notion template (duplicated per client).** Resources and SOP: setting, closing, Slack, offer stack, financing, payment links, credentials, contracts, testimonials and case studies, marketing angle, system visual, ICP docs, copy workshop. Team and communication: roster, personal Calendly for 1:1s, meeting schedule, team calls, tracking, daily workflow, team tasks. Content: Google Drive, YouTube (1x/week), Instagram. His advice on the student call: keep one universal SOP page for everyone and give each client only a duplicated page for their own checklists, so SOP updates land everywhere at once.

**Funnels.** A list of funnels per client with visits, unique visitors, completions and completion rate, a live toggle, copy link, preview, edit, and an email sequence picker per funnel. A warning banner when opt-ins are not landing in any pipeline stage, with a picker to choose the entry stage. The editor has page tabs (landing page opt-in, thank-you for operator, thank-you for offer owner, add page, import page), connect domain, desktop and mobile preview, save, view live, publish, History, and an AI Editor panel ("I build the whole page. Tell me anything...") that edits the real page. Pages are built in Claude or anywhere else and brought in with Import HTML; once inside, tracking is automatic with no UTM setup. Drag an MP4 onto a page and it becomes a tracked VSL. His opt-in is a two-step popup: first "Which best describes you?" (Operator / Offer Owner), then name, phone, email and monthly revenue.

**Analytics.** Filters for date range, UTM source and funnel, with Customize funnel. Tabs:
- Overview: live funnel tracking (page visits, unique visitors, opt-ins, applications, booked calls, application rate, booking rate), a live 3D globe of visitors, a funnel graphic with conversion against a target at each step, submissions split by the qualification answer, traffic source breakdown by UTM.
- Visitors: every visitor including anonymous ones (location, device, source, pages, scroll depth), returning visitors move to the top instead of duplicating, and phone and email validity checks. Opening one shows an AI read (one-line verdict and next action), a contact quality score (warm or hot, 0 to 100, with what drove it), total visits, submissions, time on site, last active, contact fields, attribution (source, campaign, ad click), location, and a timestamped journey: viewed page, started form, rage click, filled field, submitted, clicked buttons, VSL watched at 2m (13%), 4m (25%) and so on.
- Links: tracking links, one per channel or ad, each showing clicks -> visits -> applications -> booked -> cash, with a create-link form (name, destination funnel, source, medium, campaign, content). Short links, not long UTM strings.
- Video: per VSL plays, unique viewers, completion rate, average watch time, time to first play, average max second, and an audience retention curve.
- Typeform: started, completed, partial drop-offs, qualified, unqualified, booked, the answer spread on the qualification question, and Set qualification to define which answers count as qualified.

**CRM (two-way sync with Close).** Pipeline board, lead status counts (Typeform lead, qualified didn't book, call booked, no-show or cancelled, pitched didn't close, closed, expired, past due or inactive, unqualified), a filterable leads table with status, stage, source and deal value, post-call outcomes, upcoming calls with confirmed flag and call link, and a month calendar of calls colored by outcome. A lead drawer loads live from Close: status (changing it updates Close within seconds, and the reverse), source video, contact, opportunities, tasks, post-call form link, notes, the full lead journey from the first video, application answers, and payment status (paid in full, payment plan or monthly, amount against total, method). His point: InfoOS holds more than Close because Close never sees the pre-opt-in journey.

**Payment detection.** Stripe, Commas and Whop connect directly. For crypto, wire, Zelle or Cash App, InfoOS reads the closer's note on the lead ("PIF USDC ETH") and books the payment as a wire PIF automatically, so the dashboard stays right without manual entry.

**Email.** Kit connected: subscribers, open rate, click rate, click-to-open, emails sent, clicks, broadcasts, unsubscribe rate, engagement over time, reach per send, top broadcasts by open rate, broadcast table. The date range carries over when switching tabs.

**Team (sales floor).** Roster of setters and closers (names feed the form dropdowns). Metrics: cash, revenue, closes, close rate, show rate, calls, calls booked, live calls, cash per call, calls set, EOD reports. An AI-written team summary ("AI writes the words; InfoOS computes the numbers") that names the standout rep and flags anyone falling behind. A submission log of every set, call and EOD. Form compliance: for each closer, calls on the calendar against post-call forms filed, with the missing count; for each setter, calls booked against post-set forms. Setter booking links: paste the Calendly URL once and each setter gets their own tagged link so bookings attribute automatically. Built-in forms with copy and open links: post-set form, post-call form, EOD form (no Google Forms, no Zapier).

**Commissions.** Rules shown on screen (two pay periods a month, setters 5%, closers 15% of cash collected, course downsells 15% to the setter), a month view split into pay periods with each rep's cash, commission and a Mark paid button, and a Flagged list where the logged amount and the payment processor disagree. Setter and closer performance tables, downsell commission, renewals, commission owed. Parts of this were custom-built for one client (bi-weekly payouts, a separate ledger for payment-plan installments 2 to 4, flags when a closer's logged cash doesn't match what arrived).

**Settings.** Integrations (Close, Typeform, Calendly, ConvertKit with a reconnect warning when a provider errors), Payments (display currency with conversion at the rate on the day paid, time zone that decides which pay period a call or payment lands in, processor connect for Stripe, Commas and Whop, a green check once a real payment has come through, Stripe webhook URL generator), Pipeline, API tokens ("give a key to Claude or any tool to read this sub-account's data and build custom dashboards"), Recent changes.

**Next version (shown on a laptop, partly readable).** Light and dark mode. Three AI "department heads" plus a chief of staff in every sub-account: Flo watches the funnel (traffic, opt-ins, leaks), Anna watches the pipeline, calendar and lead list around the clock (no-shows, leads sitting too long). A home page with a score (94), "$117,270 sold but not collected", and "What to fix, in order": cards ranked by dollars at stake, each tagged with the agent that found it ("Page visit to opt-in view 39.9%, 7,498 people stop here, reaching the 45% target would...") and a "See where they drop" button that jumps to the exact metric.

## How Pulsify uses this

What we already have, so we don't rebuild it: per-prospect page and watch tracking with tracked `/a/{token}` links and location on events (pulsify-funnels), Stripe and Whop in the integrations catalog with 90-day history import, payment matching and a Mark-paid flow, Calendly and Cal.com connections, a payout calculator on the operator dashboard, operator and client separation, and the vault itself as the SOP library.

Take now, because it fits what we sell to small creators today:
1. Cash by video. Every YouTube video gets its own short tracked link in the description, and the portal ranks videos by opt-ins, calls and cash, not views. It turns our doctrine into a number the client sees. Our tracked links and payment matching are most of the plumbing.
2. The lead read. On every opt-in, a one-line AI read plus a warm or hot score built from the journey (VSL watched, time on page, pages seen, source video), and the alert to the founder or setter carries that line. We have the journey data and Discord alerts already.
3. What to fix, in order. A home card list ranked by money at stake, each with the fix from our method and a button to the metric. This is the "Action Engine" our dashboard vision already called for, and InfoOS's next version confirms a competitor is building the same thing.
4. Ask the brain. A question box over the client's data grounded in our playbooks. It fits the guided-operator direction of the portal.
5. Monthly report with Save PDF for each client.

Take when a client has a sales team: post-set, post-call and EOD forms built into the portal, form compliance (calls vs forms filed), the AI team summary, per-setter booking links, commission ledger with pay periods and processor-mismatch flags, closer auto-assignment by offer and source video, and note-based payment detection for wire and crypto.

Skip for now: Close two-way sync (we don't run Close), the Kit email tab (low value next to the rest), the globe (decoration, fails our decluttered bar), and named agent personas (keep the watching and the ranked list, drop the characters).

Needs the founder's call: the funnel builder. Import HTML plus an AI editor that edits the live page is the cheap way to build what the 2026-09-28 voice note asked for (a VSL landing page builder), but it conflicts with the locked landing-page standard (fill-in only, one design). See [[synthesis/growth-section-plan-2026-09-25]] for the current priority, which is Growth (YouTube video creation first), not backend.

## Connections

- [[synthesis/growth-section-plan-2026-09-25]] — current portal priority; most of InfoOS is backend, not Growth
- [[synthesis/pulsify-portal-master-architecture]] — where cash-by-video and the fix list would live
- [[synthesis/client-dashboard-redesign-spec-2026-07-12]] — earlier Action Engine thinking this validates
- [[synthesis/landing-page-standard]] — the rule the funnel builder would collide with
- [[people/competitor-watchlist]] — Varano row updated to point here
- [[people/jeremy-haynes]] — leads our funnel doctrine; InfoOS is one operator's tooling, not a funnel framework

## Open questions / gaps

- His revenue claims ($1.9M/month portfolio, the $28k PIF, the student's $21k first month) are unverified. The on-screen numbers are demo data by his own account.
- The high-intent call is "compare this visitor to past buyers of the same offer". The video never shows how the model or rules work, so any build of ours would start with plain scoring rules, not a claimed learning system.
- Most of the next-version screen was filmed from a distance and is only partly readable.
- The stories behind the $28k sequence lean on Dubai, Monaco and a Maybach backdrop. The structure (a case study told through the software catching the deal) is reusable; the lifestyle framing is not ours.

## Source trail

- Video: https://www.youtube.com/watch?v=AxWkPGeA-S4 (Dustin Varano, uploaded 2026-09-28, 56:02), full transcript read 2026-09-29.
- Key screens: `raw-sources/inspiration/dustin-varano-infoos/` (22 zoomed frames, numbered in video order).
- Our side verified in code 2026-09-29: `pulsify-saas/src/features/integrations/catalog.ts` (Stripe, Whop, Calendly, Cal.com), `pulsify-saas/src/features/dashboard/tabs/payouts.tsx` (payout calculator, no closer data yet), `output/standard-preview/functions/api/` (payment-matches, pipeline, webhooks, metrics-weekly).
