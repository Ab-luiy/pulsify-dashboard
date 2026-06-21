# auto-backup.ps1 — mirrors the Pulsify brain (files + Claude memory) to its GitHub
# remote. Portable: works from any clone path on any machine (locates itself via
# $PSScriptRoot and pushes whatever branch is checked out to its upstream).
# Safe to run from a Stop hook or the scheduler: no-ops when nothing changed, skips
# if git is busy, and retries a failed push on the next run.

$ErrorActionPreference = "SilentlyContinue"
$repo = $PSScriptRoot

# 1. Fold the live Claude memory into the repo (it lives outside the repo by default).
$encoded = ($repo -replace ':','') -replace '[\\/]','-'
$live    = Join-Path $env:USERPROFILE ".claude\projects\$encoded\memory"
$mem     = Join-Path $repo "claude-memory"
if (Test-Path $live) {
    New-Item -ItemType Directory -Force -Path $mem | Out-Null
    Copy-Item "$live\*" $mem -Recurse -Force
}

# 2. If another git operation is mid-flight, bail — the next run catches up.
if (Test-Path (Join-Path $repo ".git\index.lock")) { exit 0 }

# 3. Stage everything; commit only if something actually changed.
git -C $repo add -A
git -C $repo diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git -C $repo commit -q -m "auto: checkpoint $ts"
}

# 4. Push the current branch to its upstream if it's ahead (covers a new commit OR a
#    previously failed push). Silent no-op otherwise.
$ahead = (git -C $repo rev-list --count "@{u}..HEAD" 2>$null)
if ($ahead -and [int]$ahead -gt 0) {
    git -C $repo push 2>$null
}
