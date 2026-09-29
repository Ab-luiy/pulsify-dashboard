---
name: project_infoos_integration
description: "2026-09-29 founder decisions on copying Dustin Varano's InfoOS into Pulsify - look A (his design moves in OUR look, no reskin), yes to tracker-script changes, yes to client forecasts, founder funnel first, build order, NotchPop brief = Pulsify homepage"
metadata:
  node_type: memory
  type: project
  originSessionId: e0f85de8-f3a4-4484-ae1e-b5a76817c2d8
  modified: 2026-09-29T23:03:40.278Z
---

Founder rule 2026-09-29: when an operator on YouTube shows their info-offer software, copy it and add our twist. First target: Dustin Varano's InfoOS ([[synthesis/dustin-varano-video-as-brief]], screens mapped in raw-sources/inspiration/dustin-varano-infoos/README.md).

Decisions 2026-09-29 (answers to my three yes/no + look question):
- Look = A: bring his design moves (title + one plain line per block, shared filter bar with "updated at", color only on meaningful numbers, honest small print, status pills) into OUR existing tokens. No InfoOS reskin; his viewers are our buyers.
- YES: I may change the landing tracker script (`output/standard-preview/js/funnel-integrations.js`) inside the locked landing-page standard, for tracking signals only (active time, scroll depth, full scrolls, proof seen, bring-your-own-page tag). Design stays locked, see [[project_landing_page_standard]].
- YES to forecasts: record a revenue forecast per client at signing, show forecast vs actual in the monthly report. He overrode my caution.
- YES: his own funnel runs everything first (cash by video, fix list) before any client.
- He did not answer whether to delete the personal chat screenshot in the screenshots folder; leave it.

Build order: 1 cash by video (#36), 2 client home fix list (dollars at stake = extra people at target rate x existing downstream close rate x AOV, no AI), 3 leads feed with score/AI read/journey, 4 calls calendar + post-call form + call-day story nudge, 5 payment plans + plain-words payment logging, 6 Ask box, monthly report, 7 sales team/commissions when a client has a team.

Status 2026-09-29: item 1 (#36) and item 2 (#37, client Overview "Your funnel", backend functions/_shared/funnel-health.js) are LIVE (Pages 1c1a5500); the tracker's "engagement" event (active seconds, scroll, full passes, proof seconds) is live too, feeding item 3. His own funnel is not on our tracker yet (YouTube -> IG -> DM -> call), so "his funnel first" is blocked on a page he can send YouTube traffic to; asked him where his YouTube links should go.

2026-09-30: he picked option A tentatively, saw the draft homepage (#38, output/home-draft/, preview output/qa/2026-09-home-draft/pulsify-home-draft.html) and LOVED the design ("looks heat, i fking love it") but said SAVE it: only for when we have a landing page, don't replace the current main page now. Ticket #38 parked (milestone Later). So "his funnel first" is still blocked (no page on our tracker). The look is recorded as confirmed taste in visual-references/taste-profile.md. He floated bringing this look into the dashboard and client dashboard ("unless you want to..."); asked him to confirm before touching the app.

He pasted a Kage "NotchPop" landing-page design language and said "you figure this out". My reading: it is the design language for Pulsify's own homepage (pulsify-ai.com root is a 2KB stub), showing the portal running in desktop mockups. No pricing card (outbound footing: never show price, see [[feedback_inbound_outbound_footing]]); never reuse NotchPop names/copy/imagery.

**Why:** founder wants maximum leverage from competitors' shown software, but not a visible clone.
**How to apply:** copy logic freely, keep our skin; every number computed, basis printed; real proof only (Nick, [[project_nick_case_study]]).
