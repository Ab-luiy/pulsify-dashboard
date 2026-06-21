# Resuming Pulsify-Brain on another machine

Everything needed to carry on from where we left off lives in this private repo —
**except secrets**, which are intentionally not committed.

## On a new machine

1. **Clone**
   ```powershell
   git clone https://github.com/Ab-luiy/pulsify-brain.git
   cd pulsify-brain
   ```

2. **Restore Claude's memory** (so Claude resumes with full context)
   ```powershell
   ./sync-memory.ps1 pull
   ```
   This copies `claude-memory/` into this machine's `~/.claude/projects/<path>/memory/`.

3. **Recreate secrets** — create `.env` in the repo root with the same keys as before:
   ```
   IG_SESSIONID=...
   COMPOSIO_API_KEY=...
   # ...any other keys the tools/ scripts read
   ```
   (`.env` is gitignored on purpose and never leaves your machine. Keep the values in a
   password manager so you can repopulate them anywhere.)

4. **Install deps** as needed: Claude Code, Python packages (`pip install -r requirements.txt`
   if present), Node modules (`npm install`).

## Before leaving a machine

```powershell
./sync-memory.ps1 push   # fold the latest Claude memory back into the repo
git add -A
git commit -m "checkpoint: <what changed>"
git push
```

## Notes

- **This is the backup/brain repo.** The public-facing dashboard deploys from the separate
  `pulsify-dashboard` repo via Cloudflare Pages — that flow is unchanged.
- `.claude/worktrees/` (~700MB of disposable checkouts) is gitignored and does **not** sync.
