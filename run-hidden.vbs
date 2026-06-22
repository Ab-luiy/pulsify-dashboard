' run-hidden.vbs — runs a PowerShell script with NO visible window (no terminal flash).
' Usage:  wscript run-hidden.vbs "<full path to .ps1>" [wait]
'   arg 0 = the .ps1 to run
'   arg 1 = the literal word "wait" to block until it finishes (else fire-and-forget)
Dim args, doWait
Set args = WScript.Arguments
doWait = False
If args.Count > 1 Then
    If LCase(args(1)) = "wait" Then doWait = True
End If
' window style 0 = hidden; third param = wait-on-return
CreateObject("WScript.Shell").Run _
    "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & args(0) & """", 0, doWait
