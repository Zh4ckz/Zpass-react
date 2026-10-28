$Host.UI.RawUI.WindowTitle = 'Payment Bot Control - KAPATIRSAN BOT VE WEBHOOK KAPANIR'
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $projectPath '.env'
$runtimePath = Join-Path $env:TEMP 'zh4ckz-runtime'
$desktopFile = Join-Path $runtimePath 'PAYMENT-WEBHOOK-URL.txt'
$combinedUrlFile = Join-Path ([Environment]::GetFolderPath('Desktop')) 'CLIPORA-LINKS.txt'
$logPath = Join-Path $env:TEMP 'payment-bot-control'
$script:children = @()
$script:cleaned = $false

function Stop-ProcessTree([int]$processId) {
  if ($processId -gt 0) { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null }
}

function Stop-Port([int]$port) {
  $ids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($id in $ids) { Stop-ProcessTree $id }
}

function Stop-OldWebhookTunnel {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq 'cloudflared.exe' -and $_.CommandLine -match '127\.0\.0\.1:8090|localhost:8090' } |
    ForEach-Object { Stop-ProcessTree $_.ProcessId }
}

function Stop-OldPaymentBot {
  Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^python(w)?\.exe$' -and $_.CommandLine -match 'Crypto4PayBot\.py' } |
    ForEach-Object { Stop-ProcessTree $_.ProcessId }
}

function Stop-All {
  if ($script:cleaned) { return }
  $script:cleaned = $true
  foreach ($child in $script:children) {
    if ($null -ne $child -and -not $child.HasExited) { Stop-ProcessTree $child.Id }
  }
  Stop-Port 8090
}

function Start-Hidden($file, $arguments, $name) {
  return Start-Process -FilePath $file -ArgumentList $arguments -WorkingDirectory $projectPath `
    -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath "$name-out.log") `
    -RedirectStandardError (Join-Path $logPath "$name-error.log") -PassThru
}

function Get-EnvValue([string]$name) {
  if (-not (Test-Path $envFile)) { return '' }
  $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match "^\s*$([regex]::Escape($name))=" } | Select-Object -Last 1
  if (-not $line) { return '' }
  return ($line -split '=', 2)[1].Trim()
}

function Set-EnvValue([string]$name, [string]$value) {
  # .env always; the optional 1.env only when it exists (a missing one used to stop the whole start)
  $targetFiles = @($envFile) + @((Join-Path $projectPath '1.env') | Where-Object { Test-Path $_ })
  foreach ($targetFile in $targetFiles) {
    # Built as a List and filled in place: returning a List from an "if" makes PowerShell unroll
    # it, and an empty one turns into $null (then .Add() failed and the bot never started).
    $lines = [Collections.Generic.List[string]]::new()
    if (Test-Path $targetFile) { $lines.AddRange([string[]]@(Get-Content -LiteralPath $targetFile)) }
    $found = $false
    for ($index = 0; $index -lt $lines.Count; $index++) {
      if ($lines[$index] -match "^\s*$([regex]::Escape($name))=") {
        $lines[$index] = "$name=$value"
        $found = $true
      }
    }
    if (-not $found) { $lines.Add("$name=$value") }
    [IO.File]::WriteAllLines($targetFile, $lines, [Text.UTF8Encoding]::new($false))
  }
}

function Update-StripeWebhook([string]$webhookUrl) {
  $stripeKey = Get-EnvValue 'STRIPE_SECRET_KEY'
  if (-not $stripeKey) { return }
  $headers = @{ Authorization = "Bearer $stripeKey" }
  $endpoints = Invoke-RestMethod -Uri 'https://api.stripe.com/v1/webhook_endpoints?limit=10' -Headers $headers -Method Get
  $endpointId=Get-EnvValue 'STRIPE_WEBHOOK_ENDPOINT_ID'
  $endpoint=$endpoints.data | Where-Object { $_.id -eq $endpointId -or $_.description -eq 'ZPass local payment bot' } | Select-Object -First 1
  if(-not $endpoint -and -not $endpointId){$endpoint=$endpoints.data | Where-Object { $_.url -match '/stripe-webhook$' } | Select-Object -First 1}
  $knownSecret = Get-EnvValue 'STRIPE_WEBHOOK_SECRET'
  $events=@('checkout.session.completed','invoice.paid','customer.subscription.updated','customer.subscription.deleted')
  $body=@{url=$webhookUrl;description='ZPass local payment bot'}
  for($i=0;$i -lt $events.Count;$i++){ $body["enabled_events[$i]"]=$events[$i] }
  if (-not $endpoint -or -not $knownSecret) {
    $created=Invoke-RestMethod -Uri 'https://api.stripe.com/v1/webhook_endpoints' -Headers $headers -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $body
    if(-not $created.secret){throw 'Stripe webhook signing secret was not returned.'}
    Set-EnvValue 'STRIPE_WEBHOOK_SECRET' $created.secret
    Set-EnvValue 'STRIPE_WEBHOOK_ENDPOINT_ID' $created.id
    Write-Host 'Stripe signed webhook configured.'
  } else {
    Invoke-RestMethod -Uri "https://api.stripe.com/v1/webhook_endpoints/$($endpoint.id)" -Headers $headers -Method Post -ContentType 'application/x-www-form-urlencoded' -Body $body | Out-Null
  }
}

function Update-CombinedLinks([string]$paymentUrl) {
  $miniAppFile = Join-Path $runtimePath 'MINI-APP-URL.txt'
  $miniAppUrl = if (Test-Path $miniAppFile) {
    (Get-Content -LiteralPath $miniAppFile | Where-Object { $_ -match '^https://' } | Select-Object -First 1)
  } else { '' }
  $content = @(
    'CLIPORA LINKS',
    '==============================',
    'MINI APP URL:',
    $(if ($miniAppUrl) { $miniAppUrl } else { 'Clipora baslatilinca buraya yazilacak.' }),
    '',
    'PAYMENT WEBHOOK URL:',
    $paymentUrl,
    '',
    'Mini App URL -> BotFather icin',
    'Payment Webhook URL -> NOWPayments IPN icin'
  )
  Set-Content -LiteralPath $combinedUrlFile -Value $content -Encoding utf8
}

function Publish-PaymentTarget([string]$targetUrl) {
  $rootPath = Split-Path -Parent $projectPath
  $json = @{ url = $targetUrl; updatedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
  $sites = @(
    @{ Root = 'C:\Users\rezan\Desktop\Web-Sites\Zpass'; Project = 'tomsss'; Only = 'hosting'; Config = 'firebase.json' },
    @{ Root = 'C:\Users\rezan\Desktop\Web-Sites\Zpass'; Project = 'zpasss'; Only = 'hosting'; Config = 'firebase.zpass.json' }
  )
  foreach ($site in $sites) {
    if (-not (Test-Path $site.Root)) { continue }
    $apiPath = Join-Path $site.Root 'public\api'
    New-Item -ItemType Directory -Force -Path $apiPath | Out-Null
    [IO.File]::WriteAllText((Join-Path $apiPath 'payment-target.json'), $json, [Text.UTF8Encoding]::new($false))
    if (-not $site.Config) { $site.Config = 'firebase.json' }
    $cli = Join-Path $env:APPDATA 'npm\node_modules\firebase-tools\lib\bin\firebase.js'
    $deploy = Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @($cli,'deploy','--only',$site.Only,'--project',$site.Project,'--config',$site.Config,'--non-interactive') `
      -WorkingDirectory $site.Root -WindowStyle Hidden -PassThru -Wait
    if ($deploy.ExitCode -ne 0) { Write-Warning "Payment API hedefi $($site.Project) Hosting uzerine yayinlanamadi." }
  }
}

$null = Register-EngineEvent PowerShell.Exiting -Action { Stop-All }

try {
  Clear-Host
  Write-Host '===================================================' -ForegroundColor DarkCyan
  Write-Host '              PAYMENT BOT CONTROL' -ForegroundColor Cyan
  Write-Host '===================================================' -ForegroundColor DarkCyan
  Write-Host ''
  Write-Host '  BU TERMINALI KAPATIRSAN BOT VE WEBHOOK KAPANIR.' -ForegroundColor Yellow
  Write-Host ''

  if (-not (Test-Path $envFile)) { throw '.env dosyasi bulunamadi.' }
  if (-not (Get-EnvValue 'NOWPAYMENTS_API_KEY')) { throw '.env icinde NOWPAYMENTS_API_KEY eksik.' }
  if (-not (Get-EnvValue 'NOWPAYMENTS_IPN_SECRET')) { throw '.env icinde NOWPAYMENTS_IPN_SECRET eksik.' }

  New-Item -ItemType Directory -Force -Path $logPath | Out-Null
  New-Item -ItemType Directory -Force -Path $runtimePath | Out-Null
  Stop-OldPaymentBot
  Stop-Port 8090
  Stop-OldWebhookTunnel
  Start-Sleep -Milliseconds 800
  Get-ChildItem -LiteralPath $logPath -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

  Write-Host '  [1/3] Cloudflare webhook tunnel aciliyor...' -ForegroundColor Gray
  Set-Content -LiteralPath $desktopFile -Value 'Webhook linki hazirlaniyor...' -Encoding utf8
  $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($cloudflared) {
    $tunnel = Start-Hidden $cloudflared.Source @('tunnel','--url','http://127.0.0.1:8090') 'tunnel'
  } else {
    $tunnel = Start-Hidden 'npx.cmd' @('--yes','cloudflared','tunnel','--url','http://127.0.0.1:8090') 'tunnel'
  }
  $script:children += $tunnel

  $tunnelLog = Join-Path $logPath 'tunnel-error.log'
  $deadline = (Get-Date).AddSeconds(45)
  $tunnelBaseUrl = $null
  while ((Get-Date) -lt $deadline -and -not $tunnel.HasExited -and -not $tunnelBaseUrl) {
    Start-Sleep -Milliseconds 500
    if (Test-Path $tunnelLog) {
      $match = Select-String -Path $tunnelLog -Pattern 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' -AllMatches | Select-Object -Last 1
      if ($match) { $tunnelBaseUrl = $match.Matches[0].Value }
    }
  }
  if (-not $tunnelBaseUrl) { throw 'Cloudflare webhook linki olusmadi.' }

  $callbackUrl = "$tunnelBaseUrl/nowpayments-ipn"
  $stripeWebhookUrl = "$tunnelBaseUrl/stripe-webhook"
  Write-Host '  [2/3] .env callback adresi otomatik guncelleniyor...' -ForegroundColor Gray
  Set-EnvValue 'NOWPAYMENTS_IPN_CALLBACK_URL' $callbackUrl
  Set-Content -LiteralPath $desktopFile -Value $callbackUrl -Encoding utf8
  Update-CombinedLinks $callbackUrl
  Publish-PaymentTarget $tunnelBaseUrl
  try {
    Update-StripeWebhook $stripeWebhookUrl
  } catch {
    Write-Warning "Stripe webhook guncellenemedi: $($_.Exception.Message). NOWPayments calismaya devam edecek."
  }
  try { Set-Clipboard -Value $callbackUrl } catch {}
  if ($env:ZH4CKZ_MASTER -ne '1') {
    Start-Process notepad.exe -ArgumentList "`"$combinedUrlFile`""
  }

  Write-Host '  [3/3] Payment bot arka planda baslatiliyor...' -ForegroundColor Gray
  $bot = Start-Hidden 'python.exe' @('-u','Crypto4PayBot.py') 'bot'
  $script:children += $bot
  Start-Sleep -Seconds 4
  if ($bot.HasExited) {
    $errorLog = Join-Path $logPath 'bot-error.log'
    $lastError = if (Test-Path $errorLog) { (Get-Content $errorLog -Tail 5) -join ' ' } else { 'Bilinmeyen hata' }
    throw "Payment bot baslatilamadi: $lastError"
  }

  Clear-Host
  Write-Host '===================================================' -ForegroundColor Green
  Write-Host '       PAYMENT BOT + WEBHOOK CALISIYOR' -ForegroundColor Green
  Write-Host '===================================================' -ForegroundColor Green
  Write-Host ''
  Write-Host '  NOWPayments Callback URL:' -ForegroundColor Cyan
  Write-Host "  $callbackUrl" -ForegroundColor Yellow
  Write-Host ''
  Write-Host '  Link .env icine yazildi ve panoya kopyalandi.' -ForegroundColor White
  Write-Host '  Tum linkler masaustunde CLIPORA-LINKS.txt icinde.' -ForegroundColor Gray
  Write-Host ''
  Write-Host '  PAYMENT BOT : Calisiyor' -ForegroundColor Green
  Write-Host '  IPN SERVER  : Calisiyor (8090)' -ForegroundColor Green
  Write-Host '  CLOUDFLARE  : Calisiyor' -ForegroundColor Green
  Write-Host ''
  Write-Host '  !!! BU TERMINALI KAPATIRSAN HEPSI KAPANIR !!!' -ForegroundColor Red
  Write-Host '  Durdurmak icin Ctrl+C veya pencereyi kapat.' -ForegroundColor Red

  while ($true) {
    Start-Sleep -Seconds 2
    if ($bot.HasExited) { throw 'Payment bot beklenmedik sekilde kapandi.' }
    if ($tunnel.HasExited) { throw 'Cloudflare Tunnel beklenmedik sekilde kapandi.' }
  }
} catch {
  Write-Host ''
  Write-Host "HATA: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Bot ve tunnel kapatiliyor...' -ForegroundColor Yellow
  Stop-All
  if($env:ZH4CKZ_MASTER -ne '1'){Read-Host 'Cikmak icin Enter'}
  exit 1
} finally {
  Stop-All
}
