---
name: brain-online-backup
description: whole Pulsify-Brain (files + Claude memory) auto-mirrors to a private GitHub repo every turn
metadata: 
  node_type: memory
  type: project
  originSessionId: 83eea2d9-01ef-4495-a360-08b5315af296
---

The entire Pulsify-Brain backs up to the **private** repo `github.com/Ab-luiy/pulsify-brain` (set up 2026-06-21). Before this, only the dashboard was on GitHub — the brain (CRM, leads, notes, memory, ~53MB) lived only on the home PC.

- Local branch `backup` → remote `main`; remote is named `brain`. (Distinct from the deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].)
- Engine: `auto-backup.ps1` at repo root — change-gated, lock-tolerant, self-healing. It copies the live `~/.claude/projects/<encoded>/memory` into `claude-memory/`, then commits (`auto: checkpoint <ts>`) and pushes only if something changed.
- Triggers: a **Stop hook** in `~/.claude/settings.json` (fires per-turn, `async`) + an hourly Windows scheduled task **"Pulsify-Brain Auto Backup"** as backstop.
- New machine: `git clone`, then `./sync-memory.ps1 pull`, then recreate `.env` (gitignored, never synced — keep keys in a password manager). Full steps in `RESTORE.md`.
- `.claude/` (incl. the 700MB `worktrees/`) and `.env` are gitignored.

**How to apply:** the online copy is essentially live; switching machines = clone + pull memory + recreate `.env`. Don't suggest the brain is unbacked-up, and don't put brain content in `pulsify-dashboard` (that repo deploys publicly via Cloudflare).
