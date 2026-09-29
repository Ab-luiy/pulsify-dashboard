---
type: synthesis
tags: [funnel, sales, scaling]
sources: [[raw-sources/inspiration/dustin-varano-infoos/README]]
created: 2026-09-29
updated: 2026-09-29
---

# InfoOS screens mapped onto the Pulsify app

The founder handed over 51 screenshots of Dustin Varano's InfoOS (`raw-sources/inspiration/dustin-varano-infoos/screenshots/`, `040330` excluded as a personal chat). This page puts each of his screens on the Pulsify screen it belongs to, destination first. Our rule: his app is one surface with sub-accounts; ours has two, so per-client things go in the client portal (the product we sell, which the operator also sees through "view as client"), and cross-client roll-ups go in the operator console. What to build first is ranked in [[synthesis/dustin-varano-video-as-brief]]; this page is only where things go. Screenshots embed in Obsidian.

## Client portal

**Overview (`/portal`)**: add a health score, "sold but not collected", "What to fix, in order" cards with the dollar math and a do-the-fix button, today vs 29-day average, a lead-stages strip (page views -> submissions -> qualified -> booked) and a Monthly report button with Save PDF. New, built on the existing home. From: ![[Screenshot 2026-09-28 232009.png|400]] ![[Screenshot 2026-09-28 232021.png|300]] ![[Screenshot 2026-09-29 140058.png|400]] ![[Screenshot 2026-09-29 140121.png|400]]

**Performance (`/portal/performance`)**: today it is Instagram-only. Add tabs: Funnel (live funnel tiles, funnel against target, qualification split, traffic sources; no globe), VSL (plays, completion, time to first play, retention curve; we already record the watch data), Applications (set which answers count as qualified, drop-off per field) and Links (create a tracked link for an IG bio, email or ad, reusing our /a/ links). New tabs. From: ![[Screenshot 2026-09-29 134908.png|400]] ![[Screenshot 2026-09-29 134915.png|400]] ![[Screenshot 2026-09-29 135002.png|400]] ![[Screenshot 2026-09-29 134942.png|400]] ![[Screenshot 2026-09-29 134949.png|400]]

**YouTube (`/portal/youtube/cash`)**: Videos by cash. Live since #36. His links page is the general version of it. From: ![[Screenshot 2026-09-29 134955.png|400]]

**Leads (`/portal/leads`)**: becomes the client's sales pipeline. Add tabs: Visitors (live feed including anonymous visitors, warm/hot score with its reasons, scroll %, returning visitors merged to the top), Pipeline (his status list, above all "Qualified, didn't book" and "Pitched, didn't close") and Calls (upcoming calls with a confirmed flag, a month calendar colored by outcome, a day popover that opens the call link). One lead drawer for everything: source video chip, AI read that ends in an instruction, the full journey, application answers, payment type and plan progress, tasks, "File a post-call form". Extend. From: ![[Screenshot 2026-09-29 134924.png|400]] ![[Screenshot 2026-09-29 134933.png|400]] ![[Screenshot 2026-09-29 135228.png|400]] ![[Screenshot 2026-09-29 135240.png|400]] ![[Screenshot 2026-09-29 135314.png|400]] ![[Screenshot 2026-09-29 135323.png|400]] ![[Screenshot 2026-09-29 135344.png|300]] ![[Screenshot 2026-09-29 135425.png|300]] ![[Screenshot 2026-09-29 135518.png|400]] ![[Screenshot 2026-09-29 135527.png|400]]

**Pages (new item under Workspace)**: the client's live pages with visits, unique visitors, completions and rate, copy link, preview, and a page-flow view (opt-in -> thank-you pages). The builder and AI editor stay parked under the locked [[synthesis/landing-page-standard]]. From: ![[Screenshot 2026-09-29 134716.png|400]] ![[Screenshot 2026-09-29 134724.png|400]] ![[Screenshot 2026-09-29 134740.png|400]]

**Team (`/portal/team`)**: today it lists the Pulsify team. Add "Your sales team" only when a client has setters or closers: roster, per-rep numbers, AI summary, submission log, form compliance, per-setter booking links, post-set / post-call / end-of-day forms. Waits for a client with a team. From: ![[Screenshot 2026-09-29 135707.png|400]] ![[Screenshot 2026-09-29 135716.png|400]] ![[Screenshot 2026-09-29 135721.png|400]] ![[Screenshot 2026-09-29 135748.png|400]] ![[Screenshot 2026-09-29 135800.png|300]]

**Payments (`/portal/revenue`)**: add a Commissions tab (pay periods, mark paid, flags where logged cash and the processor disagree) when a team exists. From: ![[Screenshot 2026-09-29 135816.png|400]] ![[Screenshot 2026-09-29 135822.png|400]]

**Integrations and Settings (`/portal/access`, `/portal/settings`)**: plain-English error banners per connection, a green check once a real payment has come through, currency and time zone. Extend. From: ![[Screenshot 2026-09-29 135907.png|400]] ![[Screenshot 2026-09-29 135912.png|400]]

## Both shells

- **Ask box**: a panel over the client's numbers, brain and our playbooks; in the operator console it becomes a mode of the existing Ctrl+K search. From: ![[Screenshot 2026-09-28 232251.png|400]] ![[Screenshot 2026-09-28 232306.png|400]]
- **Censor toggle** in the header that blurs names, emails and money, so the founder can record the app for YouTube. From: ![[Screenshot 2026-09-29 135650.png|400]]
- **Lead alerts**: our bell and toasts already do this.

## Operator console

- **Overview (`/app`)**: each client tile carries the same health score as the client's Overview.
- **Leads (`/leads`)**: already lists funnel contacts across clients; it opens the same lead drawer.
- **Business dashboard, Payouts**: stays Pulsify's own setter and closer pay; client commissions live in the portal.

## Skipped

Kit email tab (![[Screenshot 2026-09-29 135655.png|300]]), the globe, world clocks, Close CRM sync, agent names.

## Connections

- [[synthesis/dustin-varano-video-as-brief]] — build order and the reasoning per feature
- [[synthesis/dustin-varano-infoos-teardown]] — the first feature inventory
- [[synthesis/cash-by-video-spec]] — the one already live

## Open questions / gaps

- The founder may place things differently; nothing here is decided until he confirms.
- Our own screens were not re-captured side by side (the test captures were cleared); placements come from the app's code and route map.

## Source trail

- Founder screenshots 2026-09-28/29 in `raw-sources/inspiration/dustin-varano-infoos/screenshots/`; pulsify-saas `src/app/**` and feature screen headers, read 2026-09-29.
