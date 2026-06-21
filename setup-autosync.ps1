# setup-autosync.ps1 — run ONCE on a new machine after cloning, from inside the repo:
#   ./setup-autosync.ps1
# Gets this machine mirroring the brain: restores Claude memory, registers the hourly
# backstop task, and prints the per-turn Stop hook to enable.

$repo   = $PSScriptRoot
$script = Join-Path $repo "auto-backup.ps1"

# 1. Restore Claude's memory for this machine's clone path.
& (Join-Path $repo "sync-memory.ps1") pull

# 2. Hourly scheduled-task backstop.
$taskCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$script`""
schtasks /Create /TN "Pulsify-Brain Auto Backup" /TR $taskCmd /SC MINUTE /MO 60 /F | Out-Null
Write-Host "[ok] hourly backup task registered"

# 3. Per-turn Stop hook — print it (let Claude add it, or paste into settings yourself).
$hookCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$script'"
Write-Host ""
Write-Host "NEXT — turn on the per-move push (one of):"
Write-Host "  (a) open Claude Code in this folder and say: 'set up the autosync hook on this machine'"
Write-Host "  (b) add this Stop hook to ~/.claude/settings.json yourself:"
Write-Host ""
Write-Host "      `"hooks`": { `"Stop`": [ { `"matcher`": `"`", `"hooks`": [ { `"type`": `"command`", `"command`": `"$hookCmd`", `"async`": true, `"timeout`": 120 } ] } ] }"
Write-Host ""
Write-Host "THEN: recreate your .env file (secrets never sync). See RESTORE.md."
