# setup-autosync.ps1 — run ONCE on a new machine after cloning, from inside the repo:
#   ./setup-autosync.ps1
# Makes this machine auto-sync the brain BOTH ways, completely in the background (no
# terminal windows): pulls on every Claude session start, pushes after every turn, plus
# an hourly backstop. Restores Claude's memory too. Idempotent and non-destructive.

$repo   = $PSScriptRoot
$backup = Join-Path $repo "auto-backup.ps1"
$pull   = Join-Path $repo "auto-pull.ps1"
$vbs    = Join-Path $repo "run-hidden.vbs"

# 1. Restore Claude memory for this machine's clone path.
& (Join-Path $repo "sync-memory.ps1") pull

# 2. Hourly scheduled-task backstop — launched via the hidden runner (no window).
try {
    $action  = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $vbs + '" "' + $backup + '"')
    $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date)
    $trigger.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 60) -RepetitionDuration (New-TimeSpan -Days 3650)).Repetition
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    Register-ScheduledTask -TaskName "Pulsify-Brain Auto Backup" -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
    Write-Host "[ok] hourly backup task registered (runs hidden)"
} catch {
    Write-Host "[!] couldn't register scheduled task: $_"
}

# 3. Install the Claude hooks into user settings.json. Both run via the hidden launcher
#    so nothing ever flashes a window. (Backslashes + quotes escaped for JSON.)
$settings = Join-Path $env:USERPROFILE ".claude\settings.json"
$pullRaw  = 'wscript.exe "' + $vbs + '" "' + $pull   + '" wait'
$pushRaw  = 'wscript.exe "' + $vbs + '" "' + $backup + '"'
$pullCmd  = ($pullRaw -replace '\\','\\') -replace '"','\"'
$pushCmd  = ($pushRaw -replace '\\','\\') -replace '"','\"'
$hooksJson = @"
{
    "SessionStart": [ { "matcher": "", "hooks": [ { "type": "command", "command": "$pullCmd", "timeout": 120 } ] } ],
    "Stop": [ { "matcher": "", "hooks": [ { "type": "command", "command": "$pushCmd", "async": true, "timeout": 120 } ] } ]
  }
"@

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

$installed = $false
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
    Write-Host "    Open Claude Code in this folder and say: 'set up the autosync hooks on this machine'"
}

# 4. .env reminder.
if (-not (Test-Path (Join-Path $repo ".env"))) {
    Write-Host "[todo] recreate .env with your keys (secrets never sync) - see RESTORE.md"
}
