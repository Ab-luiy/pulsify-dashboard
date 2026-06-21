# setup-autosync.ps1 — run ONCE on a new machine after cloning, from inside the repo:
#   ./setup-autosync.ps1
# Makes this machine auto-sync the brain BOTH ways with zero manual steps afterward:
#   - pulls the latest on every Claude session start
#   - pushes after every turn that changes something
#   - hourly scheduled-task backstop
# Also restores Claude's memory for this machine. Idempotent and non-destructive: if it
# can't safely edit settings.json, it prints the hooks for you to add instead.

$repo   = $PSScriptRoot
$backup = Join-Path $repo "auto-backup.ps1"
$pull   = Join-Path $repo "auto-pull.ps1"

# 1. Restore Claude memory for this machine's clone path.
& (Join-Path $repo "sync-memory.ps1") pull

# 2. Hourly scheduled-task backstop.
$taskCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$backup`""
schtasks /Create /TN "Pulsify-Brain Auto Backup" /TR $taskCmd /SC MINUTE /MO 60 /F | Out-Null
Write-Host "[ok] hourly backup task registered"

# 3. Install the Claude hooks into user settings.json (backslashes escaped for JSON).
$settings = Join-Path $env:USERPROFILE ".claude\settings.json"
$pushCmd  = ("powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$backup'") -replace '\\','\\'
$pullCmd  = ("powershell.exe -NoProfile -ExecutionPolicy Bypass -File '$pull'")   -replace '\\','\\'
$hooksJson = @"
{
    "SessionStart": [ { "matcher": "", "hooks": [ { "type": "command", "command": "$pullCmd", "timeout": 120 } ] } ],
    "Stop": [ { "matcher": "", "hooks": [ { "type": "command", "command": "$pushCmd", "async": true, "timeout": 120 } ] } ]
  }
"@

$installed = $false
$candidate = $null
if (Test-Path $settings) {
    $raw = Get-Content $settings -Raw
    $parsed = $true
    try { $obj = $raw | ConvertFrom-Json } catch { $parsed = $false }
    if ($parsed -and -not ($obj.PSObject.Properties.Name -contains 'hooks')) {
        $body = $raw.TrimEnd()
        $body = $body.Substring(0, $body.LastIndexOf('}')).TrimEnd().TrimEnd(',')
        $sep  = if ($body.TrimEnd().EndsWith('{')) { '' } else { ',' }
        $candidate = "$body$sep`n  ""hooks"": $hooksJson`n}"
    }
} else {
    New-Item -ItemType Directory -Force -Path (Split-Path $settings) | Out-Null
    $candidate = "{`n  ""hooks"": $hooksJson`n}"
}

if ($candidate) {
    try {
        $candidate | ConvertFrom-Json | Out-Null            # validate before writing
        [IO.File]::WriteAllText($settings, $candidate)      # UTF-8, no BOM
        $installed = $true
    } catch {}
}

if ($installed) {
    Write-Host "[ok] auto-sync hooks installed -> $settings  (restart Claude Code to activate)"
} else {
    Write-Host "[!] couldn't auto-edit settings.json (it already has hooks, or is custom)."
    Write-Host "    Open Claude Code in this folder and say:"
    Write-Host "      'set up the autosync hooks on this machine'"
}

# 4. .env reminder.
if (-not (Test-Path (Join-Path $repo ".env"))) {
    Write-Host "[todo] recreate .env with your keys (secrets never sync) - see RESTORE.md"
}
