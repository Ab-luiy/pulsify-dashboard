---
name: brain-online-backup
description: whole Pulsify-Brain (files + Claude memory) auto-syncs both ways with a private GitHub repo — pull on session start, push every turn
metadata: 
  node_type: memory
  type: project
  originSessionId: 83eea2d9-01ef-4495-a360-08b5315af296
---

The entire Pulsify-Brain backs up to the **private** repo `github.com/Ab-luiy/pulsify-brain` (set up 2026-06-21). Before this, only the dashboard was on GitHub — the brain (CRM, leads, notes, memory, ~53MB) lived only on the home PC.

- Local branch `backup` → remote `main`; remote is named `brain`. (Distinct from the deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].)
- Repo-root scripts (all portable via `$PSScriptRoot`): `auto-backup.ps1` (push: memory→repo, commit, push current HEAD to upstream; change-gated, lock-tolerant, self-healing), `auto-pull.ps1` (pull: `git pull --ff-only` + load memory), `sync-memory.ps1 push|pull`, `setup-autosync.ps1` (one-command new-device bootstrap).
- Memory lives OUTSIDE the repo at `~/.claude/projects/<encoded>/memory` where `<encoded>` = abs path with `-replace '[:\\/]','-'` (so `C:\…` → `C--…`, DOUBLE dash — earlier single-dash bug silently no-op'd memory sync). Mirrored into `claude-memory/`.
- Two-way auto-sync via hooks in `~/.claude/settings.json`: **SessionStart** runs `auto-pull.ps1`, **Stop** runs `auto-backup.ps1` (`async`). Plus hourly scheduled task **"Pulsify-Brain Auto Backup"** as backstop. Hooks/task are per-machine.
- Local branch `backup` → remote `main` (remote named `brain`). Distinct from deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].
- New device: install Git+Claude Code → `git clone` → `./setup-autosync.ps1` (restores memory, installs both hooks, registers task) → recreate `.env` (gitignored, never synced; keep keys in a password manager) → restart Claude. Full steps in `RESTORE.md`. `.claude/` (incl. ~700MB `worktrees/`) + `.env` are gitignored.

**How to apply:** the online copy is essentially live and bidirectional — open Claude on any set-up device and it's already current; no manual pull/push needed. Don't say the brain is unbacked-up or that switching machines needs manual sync. Don't put brain content in `pulsify-dashboard` (deploys publicly via Cloudflare).
