# Syncs Claude Code's persistent memory between this repo and the live ~/.claude store.
# The "brain" you resume from lives OUTSIDE the repo at ~/.claude/projects/<encoded-path>/memory.
# This copies it into claude-memory/ so it travels with the repo.
#
#   ./sync-memory.ps1 push   # live memory  -> repo  (run before you commit/leave a machine)
#   ./sync-memory.ps1 pull   # repo         -> live  (run once after cloning on a new machine)

param([Parameter(Mandatory=$true)][ValidateSet("push","pull")][string]$direction)

# Encoded path = this project's absolute path with ':' dropped and '\' -> '-'.
# On a new machine this auto-resolves to wherever you cloned, so memory lands in the right slot.
$projPath = (Get-Location).Path
$encoded  = ($projPath -replace ':','') -replace '[\\/]','-'
$live     = Join-Path $env:USERPROFILE ".claude\projects\$encoded\memory"
$repo     = Join-Path $projPath "claude-memory"

if ($direction -eq "push") {
    New-Item -ItemType Directory -Force -Path $repo | Out-Null
    Copy-Item "$live\*" $repo -Recurse -Force
    Write-Host "Pushed live memory -> $repo"
} else {
    New-Item -ItemType Directory -Force -Path $live | Out-Null
    Copy-Item "$repo\*" $live -Recurse -Force
    Write-Host "Pulled repo memory -> $live"
}
