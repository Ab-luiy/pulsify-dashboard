# auto-pull.ps1 — brings this machine up to date with the GitHub mirror, then loads the
# synced Claude memory into the live store. Meant to run at Claude session start so you
# resume on the latest state. Portable + safe: skips if git is busy, and only
# fast-forwards (never risks a messy mid-session merge if the branch has diverged).

$ErrorActionPreference = "SilentlyContinue"
$repo = $PSScriptRoot

if (Test-Path (Join-Path $repo ".git\index.lock")) { exit 0 }

# Fast-forward only. If local has its own unpushed commits (diverged), do nothing —
# auto-backup will push them and you reconcile manually, rather than auto-merging.
git -C $repo pull --ff-only 2>$null

# Load the freshly-pulled memory into this machine's live ~/.claude store.
& (Join-Path $repo "sync-memory.ps1") pull | Out-Null
