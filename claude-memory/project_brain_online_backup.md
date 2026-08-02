---
name: brain-online-backup
description: whole Pulsify-Brain (files + Claude memory) auto-syncs both ways with a private GitHub repo — pull on session start, push every turn
metadata: 
  node_type: memory
  type: project
  originSessionId: 83eea2d9-01ef-4495-a360-08b5315af296
  modified: 2026-08-02T00:34:27.930Z
---

The entire Pulsify-Brain backs up to the **private** repo `github.com/Ab-luiy/pulsify-brain` (set up 2026-06-21). Before this, only the dashboard was on GitHub — the brain (CRM, leads, notes, memory, ~53MB) lived only on the home PC.

- Local branch `backup` → remote `main`; remote is named `brain`. (Distinct from the deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].)
- Repo-root scripts (all portable via `$PSScriptRoot`): `auto-backup.ps1` (push: memory→repo, commit, push current HEAD to upstream; change-gated, lock-tolerant, self-healing), `auto-pull.ps1` (pull: `git pull --ff-only` + load memory), `sync-memory.ps1 push|pull`, `setup-autosync.ps1` (one-command new-device bootstrap).
- Memory lives OUTSIDE the repo at `~/.claude/projects/<encoded>/memory` where `<encoded>` = abs path with `-replace '[:\\/]','-'` (so `C:\…` → `C--…`, DOUBLE dash — earlier single-dash bug silently no-op'd memory sync). Mirrored into `claude-memory/`.
- Two-way auto-sync via hooks in `~/.claude/settings.json`: **SessionStart** runs `auto-pull.ps1`, **Stop** runs `auto-backup.ps1` (`async`). Plus hourly scheduled task **"Pulsify-Brain Auto Backup"** as backstop. Hooks/task are per-machine.
- Local branch `backup` → remote `main` (remote named `brain`). Distinct from deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].
- New device: install Git+Claude Code → `git clone` → `./setup-autosync.ps1` (restores memory, installs both hooks, registers task) → recreate `.env` if needed (gitignored, never synced; keep keys in a password manager) → restart Claude. Full steps in `RESTORE.md`. Machine-specific `.claude/` state (including `worktrees/`) and `.env` are gitignored; portable project skills under `.claude/skills/` are tracked so they travel with the private vault.

**2026-08-02 — new machine, GitHub reconnected.** Vault now also lives at `C:\Users\Lenovoi\Downloads\Pulsify-Brain` under Windows user `Lenovoi` (the older clone was `C:\Users\Abdullah\Desktop\Pulsify-Brain`; every `claude/*` worktree branch still points at those dead Abdullah paths — stale, not checkoutable here). This profile had **zero** GitHub credentials, so all pushes/pulls were failing silently. Fixed: installed `gh` 2.97.0 via winget to `C:\Program Files\GitHub CLI\gh.exe`, founder did `gh auth login --web` as **Ab-luiy** (scopes `gist, read:org, repo`), then `gh auth setup-git` wrote the credential helper into **global** git config — so plain `git` works for Codex and any other process too, not just `gh`. Device-flow gotcha worth reusing: `gh auth login --web` emits the one-time code to **stderr with no TTY**, so `Start-Process -RedirectStandardError` captures it headlessly; only the browser Authorize click needs the founder. His Chrome extension is not connected (browser tools unusable this session), which is why he had to click at all.

**Still open on this machine:** `setup-autosync.ps1` has NOT been run — `~/.claude/settings.json` has no `hooks` key and the "Pulsify-Brain Auto Backup" scheduled task does not exist. Credentials were the blocker; they no longer are. Until it runs, this clone has no automatic backup.

**How to apply:** the online copy is essentially live and bidirectional — open Claude on any set-up device and it's already current; no manual pull/push needed. Don't say the brain is unbacked-up or that switching machines needs manual sync. Don't put brain content in `pulsify-dashboard` (deploys publicly via Cloudflare).
