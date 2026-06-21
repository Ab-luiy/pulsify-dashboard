# Working on Pulsify-Brain from another device

Everything needed to carry on lives in this private repo — **except secrets**, which
are intentionally never committed. Setup on a new device is ~5 minutes, then it's
fully automatic both ways.

## One-time setup on the new device

1. **Install the basics**
   - [Git for Windows](https://git-scm.com/download/win) (includes Git Bash + credential manager)
   - [Claude Code](https://claude.com/claude-code)
   - (Only if you'll run the `tools/` scripts: Python, and Node if used)

2. **Clone the repo** (first clone prompts a GitHub sign-in — use the Ab-luiy account)
   ```powershell
   cd $HOME\Desktop
   git clone https://github.com/Ab-luiy/pulsify-brain.git
   cd pulsify-brain
   ```

3. **Run the setup helper** — one command does it all:
   ```powershell
   ./setup-autosync.ps1
   ```
   This restores Claude's memory, installs the two auto-sync hooks (pull-on-start +
   push-after-each-turn), and registers the hourly backstop task. If it can't safely
   edit `settings.json` it prints the hooks and tells you to ask Claude to add them.

4. **Recreate `.env`** in the repo root with your keys (these never sync, by design):
   ```
   IG_SESSIONID=...
   COMPOSIO_API_KEY=...
   # any other keys the tools/ scripts read
   ```
   Keep these in a password manager so you can repopulate them on any device.

5. **Restart Claude Code** once so it picks up the new hooks.

Done. From here on it's hands-off.

## Day-to-day (after setup)

Nothing. Every time you open Claude Code it **pulls the latest** before you start, and
**pushes after every turn** that changes anything. Switch between devices freely — each
one catches up on open and saves as you work.

Manual sync any time, if you ever want it:
```powershell
./auto-pull.ps1      # pull latest + load memory
./auto-backup.ps1    # commit + push now
```

## Notes

- This is the backup/brain repo. The public dashboard deploys from the separate
  `pulsify-dashboard` repo via Cloudflare Pages — that flow is unchanged.
- `.claude/` (incl. the ~700MB `worktrees/`) and `.env` are gitignored and don't sync.
- Pull is fast-forward-only: if two devices edited without syncing, it won't auto-merge —
  it leaves both sides intact for you to reconcile. Working one device at a time avoids this.
- All scripts are path-independent — clone anywhere, any username; they locate themselves.
