# auto-backup.ps1 — mirrors the Pulsify brain (files + Claude memory) to the private
# GitHub repo. Safe to run from a Stop hook or the scheduler: it does nothing when
# there's nothing to save, skips if git is busy, and retries a failed push next time.

$ErrorActionPreference = "SilentlyContinue"
$repo = "C:\Users\Abdullah\Desktop\Pulsify-Brain"

# 1. Fold the live Claude memory into the repo (it lives outside the repo by default).
$encoded = ($repo -replace ':','') -replace '[\\/]','-'
$live    = Join-Path $env:USERPROFILE ".claude\projects\$encoded\memory"
$mem     = Join-Path $repo "claude-memory"
if (Test-Path $live) {
    New-Item -ItemType Directory -Force -Path $mem | Out-Null
    Copy-Item "$live\*" $mem -Recurse -Force
}

# 2. If another git operation is mid-flight, bail — the next run will catch up.
if (Test-Path (Join-Path $repo ".git\index.lock")) { exit 0 }

# 3. Stage everything; commit only if something actually changed.
git -C $repo add -A
git -C $repo diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git -C $repo commit -q -m "auto: checkpoint $ts"
}

# 4. Push only when local is ahead of the mirror (covers a new commit OR a prior
#    failed push). No-op and silent otherwise.
$local  = (git -C $repo rev-parse backup 2>$null)
$remote = (git -C $repo rev-parse brain/main 2>$null)
if ($local -ne $remote) {
    git -C $repo push brain backup:main 2>$null
}
