param(
  [int] $Port = 8765
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$StatusDir = Join-Path $Root ".codex-tmp"
$StatusPath = Join-Path $StatusDir "dashboard-v2-server-status.txt"
$ErrorPath = Join-Path $StatusDir "dashboard-v2-server-error.txt"
$HostAddress = "127.0.0.1"

$Types = @{
  ".html" = "text/html; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
}

trap {
  New-Item -ItemType Directory -Force -Path $StatusDir | Out-Null
  Set-Content -LiteralPath $ErrorPath -Value $_.Exception.ToString() -Encoding UTF8
  exit 1
}

function Write-Response {
  param(
    [System.Net.Sockets.NetworkStream] $Stream,
    [int] $StatusCode,
    [string] $StatusText,
    [string] $ContentType,
    [byte[]] $Body
  )

  $Header = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Header)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  $Stream.Write($Body, 0, $Body.Length)
}

New-Item -ItemType Directory -Force -Path $StatusDir | Out-Null
$Address = [System.Net.IPAddress]::Parse($HostAddress)
$Listener = [System.Net.Sockets.TcpListener]::new($Address, $Port)
$Listener.Start()
Set-Content -LiteralPath $StatusPath -Value "http://$HostAddress`:$Port/dashboard-v2.html" -Encoding UTF8

while ($true) {
  $Client = $Listener.AcceptTcpClient()
  try {
    $Stream = $Client.GetStream()
    $Reader = [System.IO.StreamReader]::new($Stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $RequestLine = $Reader.ReadLine()

    while ($true) {
      $Line = $Reader.ReadLine()
      if ($null -eq $Line -or $Line -eq "") { break }
    }

    if (-not $RequestLine -or -not $RequestLine.StartsWith("GET ")) {
      $Body = [System.Text.Encoding]::UTF8.GetBytes("Method not allowed")
      Write-Response $Stream 405 "Method Not Allowed" "text/plain; charset=utf-8" $Body
      continue
    }

    $RequestPath = $RequestLine.Split(" ")[1]
    $RequestPath = $RequestPath.Split("?")[0]
    $RequestPath = [System.Uri]::UnescapeDataString($RequestPath)
    if ($RequestPath -eq "/") {
      $RequestPath = "/dashboard-v2.html"
    }

    $RelativePath = $RequestPath.TrimStart("/")
    $FilePath = [System.IO.Path]::GetFullPath((Join-Path $Root $RelativePath))

    if (-not $FilePath.StartsWith($Root)) {
      $Body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
      Write-Response $Stream 403 "Forbidden" "text/plain; charset=utf-8" $Body
    } elseif (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
      $Body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
      Write-Response $Stream 404 "Not Found" "text/plain; charset=utf-8" $Body
    } else {
      $Ext = [System.IO.Path]::GetExtension($FilePath)
      $ContentType = if ($Types.ContainsKey($Ext)) { $Types[$Ext] } else { "application/octet-stream" }
      $Body = [System.IO.File]::ReadAllBytes($FilePath)
      Write-Response $Stream 200 "OK" $ContentType $Body
    }
  } finally {
    $Client.Close()
  }
}
