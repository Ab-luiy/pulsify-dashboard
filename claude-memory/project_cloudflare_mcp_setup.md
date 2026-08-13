---
name: project_cloudflare_mcp_setup
description: "Cloudflare skills + all 5 MCP servers LIVE as of 2026-08-13; api/builds/observability granted read-only, bindings granted full access"
metadata:
  node_type: memory
  type: project
  originSessionId: 48f70152-2628-471a-b6e4-8d82cce300a6
  modified: 2026-08-13T17:38:31.940Z
---

Installed 2026-08-13 via the official Cloudflare setup prompt (`developers.cloudflare.com/agent-setup/prompt.md`):
`claude plugin marketplace add cloudflare/skills` then `claude plugin install cloudflare@cloudflare`.

**All live and connected.** 13 skills (`wrangler`, `workers-best-practices`, `durable-objects`, `cloudflare`, `agents-sdk`, `web-perf`, `turnstile-spin`, sandbox set, `cloudflare-one`, email service) plus 5 MCP servers. Use `cloudflare-docs` for live doc search instead of pretrained Cloudflare knowledge.

**Granted scopes (founder authorized 2026-08-13):**
- `cloudflare-api` (mcp.cloudflare.com, Code Mode, 2,500+ endpoints via `search()`/`execute()`) — READ ONLY
- `cloudflare-builds` — READ ONLY
- `cloudflare-observability` — READ ONLY (live Workers/Pages logs and analytics)
- `cloudflare-bindings` — FULL ACCESS (D1, KV, R2 — the only one that can write)

**Treat `bindings` writes as dangerous.** It reaches the CRM lead data in D1 and a scrape already wiped 250/320 leads once ([[project_crm_lead_loss_fix]]). Deploys never need it — Pages builds from origin/main on push ([[project_deploy_pipeline]]) — and implementation is Codex's lane ([[feedback_codex_builds_claude_specs]]). Read freely, write only when he asks for it explicitly.

**OAuth can only be done by the founder at the PC.** `claude mcp login <name>` needs a TTY; the Bash tool has none and winpty fails the same way ("stdin is not a tty"). Don't attempt it from a session. The consent screen at mcp.cloudflare.com offers Read only / Full access / Custom templates over 384 permission groups.
