---
name: project_cloudflare_mcp_setup
description: "Cloudflare skills plugin installed 2026-08-13; the 4 account MCP servers need interactive OAuth that agent sessions CANNOT complete, don't retry"
metadata: 
  node_type: memory
  type: project
  originSessionId: 48f70152-2628-471a-b6e4-8d82cce300a6
  modified: 2026-08-13T17:07:32.209Z
---

Installed 2026-08-13 via the official Cloudflare setup prompt (`developers.cloudflare.com/agent-setup/prompt.md`):
`claude plugin marketplace add cloudflare/skills` then `claude plugin install cloudflare@cloudflare`.

**Working with no auth:** 13 skills (`wrangler`, `workers-best-practices`, `durable-objects`, `cloudflare`, `agents-sdk`, `web-perf`, `turnstile-spin`, sandbox set, `cloudflare-one`, email service) and the `cloudflare-docs` MCP (live doc search — use it instead of pretrained Cloudflare knowledge).

**Blocked, do NOT retry from a session:** `cloudflare-api`, `cloudflare-bindings`, `cloudflare-builds`, `cloudflare-observability` need OAuth. `claude mcp login <name>` prints the authorize URL and opens a localhost callback listener, then exits with "stdin isn't a terminal." winpty fails the same way ("stdin is not a tty") — there is no TTY in the Bash tool surface. Driving the consent page in Chrome alone does nothing because the callback listener dies with the CLI. The only other route (a CF API token in an `Authorization` header) means handling his secrets, which is off-limits. Nothing Cloudflare is authed on this machine: no `~/.wrangler` config, no `CF_*` env vars.

**The founder must run this himself at the PC:** `claude mcp login plugin:cloudflare:cloudflare-api` (repeat for `-bindings`, `-builds`, `-observability`).

**Scope recommendation given 2026-08-13:** read-only. D1 holds the CRM lead data and a scrape already wiped 250/320 leads once ([[project_crm_lead_loss_fix]]); write access buys nothing for shipping because Pages builds from origin/main on push ([[project_deploy_pipeline]]); and read-only matches [[feedback_codex_builds_claude_specs]] exactly. If the consent screen is all-or-nothing, grant it and treat writes as off-limits by convention.

**Why it matters:** once authed, `observability` reads live Workers/Pages logs and `bindings` reaches D1 — deploy debugging and CRM queries on pulsify-funnels stop being blind.
