---
name: project_dashboard_v3_backlog
description: "Round-3 operator-dashboard feedback backlog (2026-06-24) — live-review fixes + big new features (calendar split, revenue views, multi-client navigator, theme audit, client-portal calc)"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6966459-9f75-459a-b63a-53a89db26f4d
---

Live-review feedback round on the deployed operator dashboard, 2026-06-24. Builds on [[project_dashboard_v2_spec]]. Source of truth = awesome-bassi index.html, deploy per [[project_deploy_pipeline]] (worktree off origin/main + transplant ytLeadsData/ytLeadsMeta + ff push).

**DONE + DEPLOYED (2026-06-24):**
- Line-chart dots removed (they ballooned/glowed); flat/zero data shows a "Nothing to plot yet" empty-state instead of a stretched flat line (commit 22f9ecf).
- Per-tab page titles added for Metrics/Payouts/Cash&Calendar/Instagram so they stop falling back to the "Good morning, AB" greeting (that greeting belongs ONLY on Overview/live). Payments + Plan titles made plain. TAB_TITLES is at ~line 7914 (key by tabId; missing key falls back to TAB_TITLES.live). (commit 1905033)
- Removed the generic "Quick math" arithmetic keypad from Payouts. Payout calc now auto-calcs from the deal amount: Setter 5%, Closer 10%, and OPERATOR NET FEE as a 15%–25% range (poFee15 / poFee25). User's rule: operator net fee = 15–25% of the deal.

**PENDING BACKLOG (priority-ish order):**
1. CASH & CALENDAR split — the calendar is squeezed in #tab-cashflow. Make the booked-calls CALENDAR its own section, and the booking/routing (Slack/GCal self-assign flow) its own separate section. "Expand the calendar into its own section."
2. Calendar squares HIGHLIGHTABLE by date + hour, and by when cash was collected / payment was received — tie cells to day-level cash/payment events.
3. REVENUE VIEWS: monthly, daily, and quarterly revenue (toggle/views), not just the 6-month bar.
4. PAYOUTS pie chart: make it take a BIGGER space on the page; change colors to a coordinated tone/palette.
5. THEME AUDIT: test+fix ALL 9 themes — user says "they're all faulty," design contradictions. Light-theme white-alpha flatness still pending from v2 too.
6. MULTI-CLIENT REVENUE NAVIGATOR (big new): a separate section to navigate multiple clients' revenue via a select/hover menu (e.g. Nick, Jacob). Each client has different revenue; their sales + income are based on MULTIPLE OFFERS, so revenue must separate by client AND by offer.
7. PAYMENTS editable/fillable — "it's unchangeable, should be filled out here." Likely inline-edit + localStorage (like Lead Studio [[project_lead_studio]]). (was a dismissed AskUserQuestion — don't assume, but this is the steer.)
8. PAYMENTS recent-transactions table doesn't match a design "we previously made" — NEED which one (client.html Pipeline? CRM Lead Studio? dashboard-v3/v4 table?). Was dismissed; ask again narrowly or match the dashboard's own card/list style.
9. PAYMENTS KPI numbers look "massive and out of proportion" — reduce .v.mono.large size in the pay-kpis (and check cashflow/payouts use the same .large).
10. PLAN tab full redesign → parked/later backlog, NO time framing (no 90-day, no phases, no day counters, no "days remaining"). Title already de-90-day'd; the hero/progress-bars/phase-checklist machinery still needs stripping. Content chart's "Day 30/60/90 target pace" framing is part of this 90-day concept → reconsider it too.
11. Implement the payout calculator into the CLIENT PORTAL (client.html) too.

**HARD CONSTRAINT (user, emphasized):** Do NOT reword business terms (Cash collected, MRR, Cash collected on schedule, etc.) or invent my own phrasings for business concepts. Keep exact business terminology. This walks back some of the Humanizer copy latitude for business-term labels specifically. [[feedback_humanizer_copy]]

Operator self-identifies as the agency operator; clients (Nick = trading, Jacob, etc.) are the creators whose funnels Pulsify runs. The multi-client navigator is the productization-for-multiple-clients workstream from [[project_dashboard_product_vision]].

**TRAKYO DESIGN DIRECTION (2026-06-25, user asleep/autonomous mandate):** User wants a Trakyo.io-grade redesign — "go crazy, multiple paths, not dogshit basic." Trakyo = "Track Every Dollar From YouTube": revenue attribution tying every click/opt-in/booking/sale to the exact YouTube video, via YouTube+Stripe+Calendly+Typeform; core view = per-content card (Cash Collected / Bookings / Form Submissions / Tracking Link Clicks + tabbed Performance-Over-Time chart + Recent Leads). This IS Pulsify's model → applies perfectly. I built a standalone premium prototype (NOT touching live): `pulsify-trakyo.html` (worktree) + Desktop `pulsify-trakyo-DIRECTION.html` + sent to user. Design = dark collapsible rail + light content (Linear/Vercel vibe), Inter, soft-shadow cards, emerald(money)/indigo accents, real SVG charts w/ sensible demo data, dark-mode toggle. Sections: Overview (KPIs + tabbed attribution chart + top content + leads), Content (rows → click opens attribution DRAWER = the Trakyo core), Clients (All/Nick/Jacob switcher in topbar + Total bar + per-offer revenue), Payments, Calendar, Integrations (11 connect cards: YouTube/Stripe/Calendly/Typeform/Kit/Fanbasis/Whop/Teachable/Tally/WebinarJam/ClickFunnels + manual-data-feed panel). Verified working, 0 errors. NEXT: on user approval, port this direction to the live dashboard + wire real data/integrations + fold in the rest of the backlog above. Tech stack to integrate natively: Typeform, Calendly, Kit, Stripe, Fanbasis, Whop, Teachable, Tally, WebinarJam, ClickFunnels, YouTube. Also wants Instagram as a dynamic page (reels covers shadowed + hover), cinematic Overview animation, expandable sidebar (done in proto), connectable manual data feed (done in proto).