# CODEX TASK — port the Trakyo redesign to the production portal, Phase 1 (Home + Performance)

Author: Claude. Date: 2026-07-15. Model: gpt-5.6-sol. Founder said keep rolling.

The founder-approved design lives in the preview at `output/standard-preview/portal-preview/index.html` (deployed at /portal-preview/). The production portal (`output/standard-preview/portal/index.html`) has the real logic (auth, studio, metrics, brain, proof vault, pulse feed) but the older, plainer layout. This task ports the preview's design into production for TWO surfaces only: the Home panel and the Performance panel. Read both files fully first.

## The two hard rules (these outrank everything)

1. **Logic stays intact.** Auth, session handling, all API calls, the studio flow, reels, brain, proof vault, pulse feed, and every existing panel keep working. You are restructuring markup/CSS and adding rendering code, never changing endpoint contracts or auth.
2. **No demo data in production.** The preview's numbers ($3,000, 9,100 followers, 56%, etc.) are illustrative and must NOT be copied in. Every number renders from the real endpoints the portal already calls (client-dashboard, metrics-weekly, metrics-sequences, pulse-feed) or shows an honest, instructive empty state ("connect a payment rail to see revenue here", "log your first sequence to see drop-off"). This is the standing truth-state rule. If a preview element has no real data source yet (e.g. a sparkline that needs history), ship the element with its empty state, not fake bars.

## Surface 1 — Home becomes "This week"

Replace the current Momentum-style home with the preview's This-week layout:
- The week strip: a money hero (cash collected this week + all-time, from real payments data), followers + weekly delta and $/follower (from metrics-weekly), DMs-from-stories if the metric exists, each card falling back to its instructive empty state when the source is empty.
- The "Your next move" card: computed from REAL diagnostics (metrics-sequences already returns per-sequence completion + the drop diagnostic). Rule-based v1 is fine: best type by completion -> "make more of X"; worst leak -> "retest Y"; no data -> onboarding-flavored next move (complete your brain, log your first sequence). Document the rules in a comment.
- Shipped-this-week / owed-this-week lists if the existing content_items/todos data supports them; otherwise fold what exists into the layout and skip what has no source.
- Keep the Pulse feed block that now lives on Revenue; move it onto Home if that matches the preview flow better (founder's heartbeat screen), your call, one place only.

## Surface 2 — Performance gets the preview's depth

- The slide-by-slide retention curve (the SVG area chart with the cliff marked) rendered from a real sequence's per-slide views when sequence_log rows exist; empty state otherwise.
- The type leaderboard (completion by sequence type, bars, dimmed rows for types with no data) from real metrics.
- Keep the existing KPI cards + sequence rows + log-sequence flow working; restyle to the preview's treatment (badges, bars, curve-note).

## Styling

Reuse `shared/pulsify-ui.css` tokens; add what is missing there rather than inlining large new blocks (the preview's CSS for week-strip, next, curve, lb-rows can be adapted into the shared sheet or the portal's style block, keep it consistent with how the portal is currently structured). Dark mode must keep working. No horizontal overflow at 390px.

## Discipline

- LOCAL-VERIFY ONLY: `node --check` extracted portal inline JS; ALL existing test suites under tests/ still pass; a static check that none of the preview's demo literals ($3,000 / 9,100 / $0.88 / 21,043 etc.) appear in the production portal file.
- NO deploy, NO remote D1, NO commit, NO secrets, NO migration (none needed).
- Voice: no em-dashes or en-dashes, no reward copy, sentence case.
- Claim files on AGENT_CHAT.md Lock Board first; post a done note with exact files + verification. Claude reviews (logic-intact is the top check) then deploys.

## Not in scope

The remaining preview surfaces (Revenue drawers/settings tab, Team board, Plans restyle, Studio insight strip/pipeline/frames) are Phase 2+. Do not touch them in this pass.
