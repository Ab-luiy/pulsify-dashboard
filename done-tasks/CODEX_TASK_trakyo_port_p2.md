# CODEX TASK — Trakyo port Phase 2 (Revenue, Team, Plans, Studio insight)

Author: Claude. Date: 2026-07-16. Model: gpt-5.6-sol. Founder said go.

Continuation of `CODEX_TASK_trakyo_port_p1.md` (Home + Performance shipped and live). Same source of design truth: `output/standard-preview/portal-preview/index.html`. Same target: `output/standard-preview/portal/index.html` (+ `shared/pulsify-ui.css` for shared tokens). Read both files and the P1 done note first.

## The same two hard rules (they outrank everything)

1. **Logic stays intact.** Auth, sessions, every endpoint contract, and every existing flow (studio generate/review, reels, brain, proof vault, pulse, the new Home/Performance) keep working. Static check: the `/api/` endpoint set in the portal file must be unchanged or only extended by endpoints that already exist server-side.
2. **No demo data.** Preview numbers and preview-invented team members (Abdullah/Max/Herman rows are demo), plan percentages, and insight copy must NOT be copied in. Real data or instructive empty states.

## Surface 1 — Revenue gets the preview treatment

- The preview's KPI card styling for the revenue numbers that already render (all-time, this-month, payments count, goal tracker vs the client's revenue goal when set in the brain funnel facts; empty state otherwise).
- Payment history restyled to the preview's table treatment.
- The two entry points: an Integrations block and a Settings block. Integrations: render the client's real connection states from the existing client-integrations endpoint (connected providers with status, others as instructive rows). Settings: read/edit the fields the client is allowed to touch that already have a home (their brain identity fields via client-brain); do NOT invent new server settings.

## Surface 2 — Team

- The preview's member-card layout, rendered from whatever team data the portal already receives (client_dashboard_content / the dashboard payload). If the current payload has no team rows for this client, show the preview-quality empty state ("your Pulsify team appears here once assigned"), never the demo people.

## Surface 3 — Plans

- The preview's plan-card treatment (title, status badge, progress bar, date meta) over the existing plans data in the dashboard payload; instructive empty state when none.

## Surface 4 — Studio insight strip ("This week's read")

- The preview's insight card at the top of Studio, computed from REAL data: best type by completion and the biggest leak from metrics-sequences (the same rule engine Home's next-move card uses; reuse that code, do not duplicate), sequence/DM counts from the real rows, and the two action buttons wiring to the existing studio generate flow and the existing log/retest surfaces. When no metrics exist, the strip shows the onboarding-flavored read.
- The pipeline strip (counts by status) from real studio_sequences statuses (draft/review/approved) — only statuses that actually exist in the schema; do not invent stages.

## Discipline

Identical to P1: LOCAL-VERIFY ONLY (extracted inline JS `node --check`, ALL 9+ test suites pass, static check that preview demo literals and demo names are absent from production), no deploy/remote-D1/commit/secrets/migration, no em-dashes or en-dashes, no reward copy. Claim files on the AGENT_CHAT.md Lock Board first; post a done note with exact files + verification. Claude reviews (logic-intact first) then deploys.

## Not in scope

The command palette, retest-variant lineage, winning-frames rail, and carousel library from the preview (those need new server data and are their own task). Operator/admin surfaces. Any new tables.
