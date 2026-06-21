# sync-memory.ps1 — moves Claude Code's persistent memory between this repo and the
# live ~/.claude store. The "brain" Claude resumes from lives OUTSIDE the repo at
# ~/.claude/projects/<encoded-path>/memory; this keeps a copy in claude-memory/ so it
# travels with the repo. Run from anywhere — it locates itself via $PSScriptRoot.
#
#   ./sync-memory.ps1 push   # live memory -> repo  (before you commit / leave a machine)
#   ./sync-memory.ps1 pull   # repo -> live         (once, after cloning on a new machine)

param([Parameter(Mandatory=$true)][ValidateSet("push","pull")][string]$direction)

# Encoded path = this repo's absolute path with ':' dropped and '\' -> '-'. Derived
# from where the script lives, so it auto-resolves to wherever you cloned.
$projPath = $PSScriptRoot
$encoded  = $projPath -replace '[:\\/]','-'
$live     = Join-Path $env:USERPROFILE ".claude\projects\$encoded\memory"
$repo     = Join-Path $projPath "claude-memory"

if ($direction -eq "push") {
    New-Item -ItemType Directory -Force -Path $repo | Out-Null
    if (Test-Path "$live\*") { Copy-Item "$live\*" $repo -Recurse -Force }
    Write-Host "Pushed live memory -> $repo"
} else {
    New-Item -ItemType Directory -Force -Path $live | Out-Null
    if (Test-Path "$repo\*") { Copy-Item "$repo\*" $live -Recurse -Force }
    Write-Host "Pulled repo memory -> $live"
}
