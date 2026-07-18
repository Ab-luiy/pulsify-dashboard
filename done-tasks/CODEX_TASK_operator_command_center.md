# CODEX TASK — operator command center (god-view, Phase 1)

Author: Claude. Date: 2026-07-15. Model: gpt-5.6-sol. Founder said proceed hands-off.

The operator god-view from the master architecture (`wiki/synthesis/pulsify-portal-master-architecture.md`): a cross-client rollup so the operator runs many clients at once, a client health score to protect revenue, and the audit-trail foundation. Read-only over data that already exists. Everything lands on the pulsify-funnels stack (`output/standard-preview`, D1 `pulsify-portal`, `/admin`). ADMIN_KEY gated.

Read `functions/api/campaigns.js` first: it already merges `client_config` with per-client aggregates in a small fixed number of queries ("never N queries per client"). Follow that exact efficient pattern. Do not run one query per client.

## Real tables to aggregate (verified)

- `client_config` (client, client_name) is the client list.
- `payments` (per-client amounts + dates).
- `account_snapshots` (per-client follower/metric snapshots over time; latest vs prior = trend).
- `sequence_log` and/or `studio_sequences` (content cadence, last posted, count in last 7 days).
- `client_brain` (rows per client_id/section/field = brain completeness, how many of the 8 sections have any fields).
- `page_events` (last visitor activity).
Confirm the exact columns against the migrations before querying.

## Build

1. **Migration** (next number after 0014): `operator_events` table (id, actor, action, client, detail, created_at) for the audit trail. Additive only.
2. **Endpoint** `functions/api/operator-overview.js` (ADMIN_KEY gated, 401 without the key):
   - Returns every `client_config` client merged with per-client signals in a small fixed number of queries (campaigns.js pattern): total collected + last payment date; latest followers + delta vs the prior snapshot (trend up/flat/down); content cadence (count in last 7 days + last posted date); brain completeness (percent of the 8 sections that have at least one field); last activity (max timestamp across payments, sequence_log/studio_sequences, page_events).
   - Compute a **health score** 0 to 100 and a label (healthy / watch / at-risk) from: onboarded (brain completeness), cadence (posting recency vs the 3-to-7 target), metrics trend (followers rising vs falling), payments present, and activity recency. Document the weight of each input in a comment. Null-safe: a brand-new client with no data reads as "new / needs onboarding", not a fake zero-health.
   - Include a small summary block: client count, at-risk count, total collected.
3. **Admin UI** (a Command center / Clients rollup in `admin.html` + `admin/console.js` + `admin/console.css`): a sortable table of all clients showing name, health badge, collected, follower trend, cadence, brain completeness, last activity. At-risk clients surface at the top. Matches the existing console styling. Opening a client row logs an `operator_events` row (action = view-client) and shows a small recent operator-activity list from that table.

## Not in Phase 1 (do not build)

Full read-only client impersonation ("open the client workspace exactly as they see it") is Phase 2 and security-sensitive; leave it. No cross-repo changes. No new external APIs.

## Discipline

- LOCAL-VERIFY ONLY: `node --check` every touched JS file; a mocked-D1 test that the rollup aggregates the right per-client numbers, the health score computes and labels correctly for a healthy, an at-risk, and a brand-new client, and that the endpoint 401s without ADMIN_KEY. Confirm existing followups, client-brain, view-tracking, and campaigns flows still pass.
- Migration additive; NO deploy, NO remote D1, NO commit, NO secrets.
- Voice: no em-dashes or en-dashes, no reward copy, sentence case.
- Claim files on AGENT_CHAT.md Lock Board first; post a done note with exact files + verification. Claude reviews, runs the migration, and deploys.
