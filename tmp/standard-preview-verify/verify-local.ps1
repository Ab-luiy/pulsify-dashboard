$ErrorActionPreference = "Stop"
$wrangler = "C:\Users\Abdullah\AppData\Local\npm-cache\_npx\32026684e21afda6\node_modules\.bin\wrangler.cmd"
$workdir = "C:\Users\Abdullah\Desktop\Pulsify-Brain\tmp\standard-preview-verify"
$base = "http://127.0.0.1:8799"

$job = Start-Job -ScriptBlock {
  param($wranglerPath, $dir)
  Set-Location $dir
  $env:XDG_CONFIG_HOME = "$dir\.wrangler-config"
  $env:ADMIN_KEY = "local-admin-key"
  & $wranglerPath pages dev --ip 127.0.0.1 --port 8799
} -ArgumentList $wrangler, $workdir

try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    & curl.exe -s -o NUL "$base/portal/login?client=acme-coach" | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw "wrangler pages dev did not become reachable on 127.0.0.1:8799" }

  $setupResponse = & curl.exe -s -X POST "$base/api/client-setup-link" -H "x-admin-key: local-admin-key" -H "content-type: application/json" --data-raw '{"client":"acme-coach","email":"client@example.com"}'
  $setup = $setupResponse | ConvertFrom-Json
  $setupUri = [Uri]$setup.link
  $setupToken = [System.Web.HttpUtility]::ParseQueryString($setupUri.Query).Get("setup")

  $setPasswordHeaders = Join-Path $workdir "verify-set-password-headers.txt"
  $setPasswordBody = Join-Path $workdir "verify-set-password-body.txt"
  & curl.exe -s -D $setPasswordHeaders -o $setPasswordBody -X POST "$base/api/client-set-password" -H "content-type: application/json" --data-raw ('{"setup_token":"' + $setupToken + '","password":"StrongPass123"}') | Out-Null
  $setPasswordStatus = (Select-String -Path $setPasswordHeaders -Pattern '^HTTP/.*\s(\d{3})' | Select-Object -First 1).Matches[0].Groups[1].Value
  $sessionCookie = (Select-String -Path $setPasswordHeaders -Pattern '^Set-Cookie:\s*([^;]+)' | Select-Object -First 1).Matches[0].Groups[1].Value

  $loginHeaders = Join-Path $workdir "verify-login-headers.txt"
  $loginBody = Join-Path $workdir "verify-login-body.txt"
  & curl.exe -s -D $loginHeaders -o $loginBody -X POST "$base/api/client-login" -H "content-type: application/json" --data-raw '{"email":"client@example.com","password":"StrongPass123"}' | Out-Null
  $loginStatus = (Select-String -Path $loginHeaders -Pattern '^HTTP/.*\s(\d{3})' | Select-Object -First 1).Matches[0].Groups[1].Value
  $loginCookie = (Select-String -Path $loginHeaders -Pattern '^Set-Cookie:\s*([^;]+)' | Select-Object -First 1).Matches[0].Groups[1].Value

  $badStatuses = @()
  for ($i = 0; $i -lt 5; $i++) {
    $badHeaders = Join-Path $workdir ("verify-bad-login-{0}.txt" -f $i)
    & curl.exe -s -D $badHeaders -o NUL -X POST "$base/api/client-login" -H "content-type: application/json" --data-raw '{"email":"client@example.com","password":"wrong-password"}' | Out-Null
    $badStatuses += (Select-String -Path $badHeaders -Pattern '^HTTP/.*\s(\d{3})' | Select-Object -First 1).Matches[0].Groups[1].Value
  }

  $noCookieHeaders = Join-Path $workdir "verify-no-cookie.txt"
  & curl.exe -s -D $noCookieHeaders -o NUL "$base/portal?client=acme-coach" | Out-Null
  $noCookieStatus = (Select-String -Path $noCookieHeaders -Pattern '^HTTP/.*\s(\d{3})' | Select-Object -First 1).Matches[0].Groups[1].Value
  $noCookieLocation = (Select-String -Path $noCookieHeaders -Pattern '^Location:\s*(.+)$' | Select-Object -First 1).Matches[0].Groups[1].Value.Trim()

  $pageHeaders = Join-Path $workdir "verify-page-headers.txt"
  $pageBody = Join-Path $workdir "verify-page-body.html"
  & curl.exe -s -D $pageHeaders -o $pageBody "$base/portal?client=acme-coach" -H "Cookie: $loginCookie" | Out-Null
  $pageStatus = (Select-String -Path $pageHeaders -Pattern '^HTTP/.*\s(\d{3})' | Select-Object -First 1).Matches[0].Groups[1].Value
  $pageHasRevenue = Select-String -Path $pageBody -Pattern 'Revenue' -Quiet

  $todoPost = & curl.exe -s -X POST "$base/api/client-dashboard-todo" -H "content-type: application/json" -H "Cookie: $loginCookie" --data-raw '{"client":"acme-coach","index":0,"done":true}'
  $todoPostJson = $todoPost | ConvertFrom-Json
  $dashboardJson = & curl.exe -s "$base/api/client-dashboard?client=acme-coach" -H "Cookie: $loginCookie"
  $dashboard = $dashboardJson | ConvertFrom-Json
  $firstTodoDone = [bool]$dashboard.sections.todos[0].done
  $paymentCount = [int]$dashboard.revenue.payment_count
  $paymentAmount = [int]$dashboard.revenue.payments[0].amount_cents

  [pscustomobject]@{
    setup_link_ok = $setup.ok
    set_password_status = $setPasswordStatus
    successful_login_status = $loginStatus
    bad_login_statuses = ($badStatuses -join ",")
    dashboard_without_cookie = "$noCookieStatus -> $noCookieLocation"
    dashboard_with_cookie = "$pageStatus (html contains Revenue: $pageHasRevenue)"
    todo_post_ok = $todoPostJson.ok
    todo_first_item_done = $firstTodoDone
    payment_count = $paymentCount
    first_payment_amount_cents = $paymentAmount
  } | ConvertTo-Json -Compress
}
finally {
  Stop-Job -Job $job -ErrorAction SilentlyContinue | Out-Null
  Remove-Job -Job $job -Force -ErrorAction SilentlyContinue | Out-Null
}
