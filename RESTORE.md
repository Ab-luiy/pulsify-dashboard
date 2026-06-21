# Working on Pulsify-Brain from another laptop

Everything needed to carry on lives in this private repo — **except secrets**, which
are intentionally never committed. Setup on a new machine is ~5 minutes.

## One-time setup on the new laptop

1. **Install the basics**
   - [Git for Windows](https://git-scm.com/download/win) (includes Git Bash + credential manager)
   - [Claude Code](https://claude.com/claude-code)
   - (Only if you'll run the `tools/` scripts: Python, and Node if used)

2. **Clone the repo**
   ```powershell
   cd $HOME\Desktop
   git clone https://github.com/Ab-luiy/pulsify-brain.git
   cd pulsify-brain
   ```
   First clone will ask you to sign in to GitHub — use the same account (Ab-luiy).

3. **Run the setup helper** (restores Claude's memory + arms the hourly backstop)
   ```powershell
   ./setup-autosync.ps1
   ```

4. **Turn on the per-move push** — open Claude Code in this folder and say
   *"set up the autosync hook on this machine"* (it edits this machine's settings),
   or paste the Stop hook that `setup-autosync.ps1` printed into `~/.claude/settings.json`.

5. **Recreate `.env`** in the repo root with your keys (these never sync, by design):
   ```
   IG_SESSIONID=...
   COMPOSIO_API_KEY=...
   # any other keys the tools/ scripts read
   ```
   Keep these in a password manager so you can repopulate them on any machine.

That's it — open Claude Code in the folder and carry on. Work auto-pushes back to GitHub.

## Day-to-day

Nothing to do — every change pushes automatically (per-turn hook + hourly task).
Switching machines just means the other one runs `git pull` (or you re-clone). To force
a sync manually any time:
```powershell
./auto-backup.ps1
```

## Notes

- This is the backup/brain repo. The public dashboard deploys from the separate
  `pulsify-dashboard` repo via Cloudflare Pages — that flow is unchanged.
- `.claude/` (incl. the ~700MB `worktrees/`) and `.env` are gitignored and don't sync.
- The scripts are path-independent — clone anywhere, under any username; they locate
  themselves.
