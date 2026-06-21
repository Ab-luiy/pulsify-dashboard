# auto-backup.ps1 — mirrors the Pulsify brain (files + Claude memory) to its GitHub
# remote. Portable: works from any clone path on any machine (locates itself via
# $PSScriptRoot and pushes whatever branch is checked out to its upstream).
# Safe to run from a Stop hook or the scheduler: no-ops when nothing changed, skips
# if git is busy, and retries a failed push on the next run.

$ErrorActionPreference = "SilentlyContinue"
$repo = $PSScriptRoot

# 1. Fold the live Claude memory into the repo (it lives outside the repo by default).
$encoded = $repo -replace '[:\\/]','-'
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

# 4. Push current HEAD to its upstream remote+branch when ahead (covers a new commit OR
#    a prior failed push). Uses explicit HEAD:<branch> so it works even when the local
#    branch name differs from the upstream's (e.g. local 'backup' tracking remote 'main').
$upstream = (git -C $repo rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
if ($upstream) {
    $ahead = (git -C $repo rev-list --count "@{u}..HEAD" 2>$null)
    if ($ahead -and [int]$ahead -gt 0) {
        $remote  = $upstream.Split('/')[0]
        $rbranch = $upstream.Substring($remote.Length + 1)
        git -C $repo push $remote "HEAD:$rbranch" 2>$null
    }
}
