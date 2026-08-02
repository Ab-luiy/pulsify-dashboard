---
name: brain-online-backup
description: whole Pulsify-Brain (files + Claude memory) auto-syncs both ways with a private GitHub repo — pull on session start, push every turn
metadata: 
  node_type: memory
  type: project
  originSessionId: 83eea2d9-01ef-4495-a360-08b5315af296
  modified: 2026-08-02T00:47:01.704Z
---

The entire Pulsify-Brain backs up to the **private** repo `github.com/Ab-luiy/pulsify-brain` (set up 2026-06-21). Before this, only the dashboard was on GitHub — the brain (CRM, leads, notes, memory, ~53MB) lived only on the home PC.

- Local branch `backup` → remote `main`; remote is named `brain`. (Distinct from the deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].)
- Repo-root scripts (all portable via `$PSScriptRoot`): `auto-backup.ps1` (push: memory→repo, commit, push current HEAD to upstream; change-gated, lock-tolerant, self-healing), `auto-pull.ps1` (pull: `git pull --ff-only` + load memory), `sync-memory.ps1 push|pull`, `setup-autosync.ps1` (one-command new-device bootstrap).
- Memory lives OUTSIDE the repo at `~/.claude/projects/<encoded>/memory` where `<encoded>` = abs path with `-replace '[:\\/]','-'` (so `C:\…` → `C--…`, DOUBLE dash — earlier single-dash bug silently no-op'd memory sync). Mirrored into `claude-memory/`.
- Two-way auto-sync via hooks in `~/.claude/settings.json`: **SessionStart** runs `auto-pull.ps1`, **Stop** runs `auto-backup.ps1` (`async`). Plus hourly scheduled task **"Pulsify-Brain Auto Backup"** as backstop. Hooks/task are per-machine.
- Local branch `backup` → remote `main` (remote named `brain`). Distinct from deploy repo `pulsify-dashboard` — see [[deploy-pipeline]].
- New device: install Git+Claude Code → `git clone` → `./setup-autosync.ps1` (restores memory, installs both hooks, registers task) → recreate `.env` if needed (gitignored, never synced; keep keys in a password manager) → restart Claude. Full steps in `RESTORE.md`. Machine-specific `.claude/` state (including `worktrees/`) and `.env` are gitignored; portable project skills under `.claude/skills/` are tracked so they travel with the private vault.

**2026-08-02 — new machine, GitHub reconnected.** Vault now also lives at `C:\Users\Lenovoi\Downloads\Pulsify-Brain` under Windows user `Lenovoi` (the older clone was `C:\Users\Abdullah\Desktop\Pulsify-Brain`; every `claude/*` worktree branch still points at those dead Abdullah paths — stale, not checkoutable here). This profile had **zero** GitHub credentials, so all pushes/pulls were failing silently. Fixed: installed `gh` 2.97.0 via winget to `C:\Program Files\GitHub CLI\gh.exe`, founder did `gh auth login --web` as **Ab-luiy** (scopes `gist, read:org, repo`), then `gh auth setup-git` wrote the credential helper into **global** git config — so plain `git` works for Codex and any other process too, not just `gh`. Device-flow gotcha worth reusing: `gh auth login --web` emits the one-time code to **stderr with no TTY**, so `Start-Process -RedirectStandardError` captures it headlessly; only the browser Authorize click needs the founder. His Chrome extension is not connected (browser tools unusable this session), which is why he had to click at all.

**Autosync armed on this machine 2026-08-02** (hourly task + both hooks + verified push, local `dabfde0` == `brain/main`). Deliberately ran only steps 2-3 of `setup-autosync.ps1`, **skipping step 1** (`sync-memory.ps1 pull`): that step force-copies `claude-memory/` over live memory, and 63 of 64 files were already byte-identical, so it only risked reverting a note written minutes earlier. Do the same on any machine whose live memory is already current — step 1 is for a fresh clone only. Pre-edit `settings.json` backup at `~/.claude/settings.json.pre-autosync.bak`; undo = `Unregister-ScheduledTask -TaskName "Pulsify-Brain Auto Backup"` + restore that file. Chrome extension now connected too, so browser steps no longer need the founder to click.

**When the founder is nervous about a maintenance script, read it to him rather than reassuring him.** He asked directly whether the setup could corrupt or lose files. Reading `setup-autosync.ps1`, `auto-backup.ps1`, and `sync-memory.ps1` and reporting the concrete blast radius — it never writes to the vault, push is one-directional, `pull --ff-only` refuses to merge on divergence, the single real risk is one memory note — converted a "go" out of a hard no. Naming the one genuine risk is what made the rest credible.

**How to apply:** the online copy is essentially live and bidirectional — open Claude on any set-up device and it's already current; no manual pull/push needed. Don't say the brain is unbacked-up or that switching machines needs manual sync. Don't put brain content in `pulsify-dashboard` (deploys publicly via Cloudflare).
