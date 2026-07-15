# Pulsify Slack operating system

Slack is the visible operating room for the founder, Claude, and Codex. The Pulsify vault remains the source of truth. Slack exposes what is moving, what changed, what is blocked, and what requires a decision.

## Workspace identities

- Workspace: Pulsify AI Ltd.
- Team ID: `T0BHDN431C5`
- Founder Slack user: `U0BHLNKBL3E`
- Claude Slack agent: `U0BHDJKDPQT`
- ChatGPT/Codex Slack agent: `U0BH4D9H3M5`

Do not store OAuth tokens, API keys, webhook secrets, passwords, or client credentials in this file or in Slack.

## Channel map

| Channel | ID | Job |
|---|---|---|
| `#ai-command-center` | `C0BHDKY22SF` | Founder decisions, Claude/Codex handoffs, priority changes, and cross-lane coordination. |
| `#daily-briefing` | `C0BHHTB0D8W` | Scheduled morning and evening visibility: shipped, changed, active, blocked, founder asks. |
| `#build-log` | `C0BJE7J93UG` | Code, vault, deployment, test, and release summaries. |
| `#decisions` | `C0BHMQQUBSM` | Durable decisions that should not be relitigated without the founder. |
| `#blockers` | `C0BJE7JD7U0` | Parked or blocked work with an owner and a precise unblock condition. |
| `#content-engine` | `C0BHMQRJP09` | Ideas, briefs, packaging, scripts, performance reads, variants, and retest decisions. |
| `#offer-funnel` | `C0BHKT7249Y` | Positioning, offer mechanics, funnel decisions, conversion gaps, and follow-up strategy. |
| `#client-ops` | `C0BHPJU4AA0` | Client actions, KPI changes, deadlines, delivery state, and reusable client-derived insights. |

Claude and ChatGPT/Codex are members of every channel above.

## Source-of-truth split

Slack carries visibility and conversation. Durable state still belongs in the vault:

- File ownership and collision control: `AGENT_CHAT.md`
- Code and exact diffs: git
- Reusable business knowledge: `wiki/`
- Chronological knowledge changes: `wiki/log.md`
- Client decisions and KPIs: `clients/{name}/decisions.md` and `clients/{name}/progress.md`
- Current project orientation: `claude-memory/MEMORY.md`

If a Slack discussion creates reusable knowledge or changes a decision, file it back into the correct vault page. A message alone is not a completed record.

## Message protocol

Every material update begins with exactly one status label:

- `STARTED` - work has begun and ownership is clear.
- `CHANGED` - scope, priority, or implementation direction moved.
- `DONE` - the outcome is verified and no required work remains.
- `BLOCKED` - progress needs a named input or external state change.
- `DECISION` - the founder or an authorized owner settled a durable choice.
- `HANDOFF` - another agent has a concrete next action.

Use this structure for STARTED, DONE, BLOCKED, and HANDOFF messages:

```text
STATUS: HANDOFF
OWNER: Claude | Codex | Founder
TASK: One-sentence outcome
CONTEXT: What changed and why it matters
FILES/SURFACES: Exact paths, URLs, or Slack channels
ACCEPTANCE: Tests or proof required
NEXT: One concrete action
```

Do not write vague entries such as "working on it," "later," or "needs review." State what is moving and what proves it is finished.

## Lane routing

- Cross-lane priority or AI handoff -> `#ai-command-center`
- Daily operating summary -> `#daily-briefing`
- Repo, app, deployment, migration, or test result -> `#build-log`
- Founder-approved durable choice -> `#decisions`
- Missing credential, external enablement, dependency, or intentional hold -> `#blockers`
- Content strategy, production, or performance -> `#content-engine`
- Offer, funnel, acquisition, conversion, or follow-up -> `#offer-funnel`
- Client-specific work -> `#client-ops`

When one change crosses lanes, post the full update once in the primary channel and link or summarize it briefly elsewhere. Do not duplicate walls of text across Slack.

## Daily briefing contract

The briefing is operational, not motivational. It answers:

1. What shipped
2. What changed
3. What is active
4. What is blocked
5. What needs the founder today

The agent must read the latest `AGENT_CHAT.md`, `wiki/log.md`, relevant client progress/decisions, and git status before posting. Never infer a status from memory when the repo can verify it.

## Claude and Codex conversation model

Slack is a shared handoff room, not a guaranteed autonomous bot loop.

- Claude can be messaged directly or mentioned in a channel after the founder connects the Claude account.
- Codex can read and post through the installed Slack connector when a Codex task or automation is running.
- A message from one bot may not trigger the other bot. Slack and marketplace apps can ignore bot-generated messages or require a human-triggered session.
- When a response is required, use one of: a founder mention, a Codex automation, the repo cross-call protocol, or a direct Claude/Codex task.
- No agent repeatedly mentions the other to force a loop. Depth remains one unless the founder explicitly approves more.

## Privacy boundary

Allowed in Slack:

- Status summaries
- File paths and deployment URLs
- Non-sensitive decisions
- Redacted KPIs and delivery state
- Action items, owners, deadlines, and acceptance checks

Keep out of Slack:

- API keys, passwords, session cookies, OAuth tokens, and webhook secrets
- Raw lead lists or client personal information
- Private financial details
- Unredacted call transcripts
- Files or screenshots containing credentials or sensitive client data

Sensitive source material stays in the vault or the approved client system. Post only the minimum summary needed to coordinate work.

## Scheduled briefings

- `pulsify-morning-slack-briefing` runs daily at 09:00 local time and posts the verified operating brief to `#daily-briefing`.
- `pulsify-evening-slack-digest` runs daily at 20:00 local time, posts the end-of-day digest, and mirrors any missing material build entry to `#build-log`.

Both automations run locally against the Pulsify-Brain project. The machine and Codex automation service must be available at the scheduled time. Manual STARTED, DONE, BLOCKED, DECISION, and HANDOFF posts remain required; the scheduled jobs are the backstop, not the only logging mechanism.

## Maintenance

- Keep channel names and IDs current here.
- If a channel is replaced, update both agent manuals and scheduled automations in the same change.
- Review the briefing and blocker channels weekly for stale items.
- Close a blocker by replying with the resolution, then update the canonical vault record.
- Treat `#decisions` as append-only in practice. Corrections should supersede old decisions explicitly rather than silently editing history.
