param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$env:ZH4CKZ_MASTER='1'
$botsRoot=Split-Path -Parent $MyInvocation.MyCommand.Path
$siteRoot='C:\Users\rezan\Desktop\Web-Sites\Zpass'
$logRoot=Join-Path $botsRoot 'runtime-logs'
$python='C:\Users\rezan\AppData\Local\Programs\Python\Python311\python.exe'
$node='C:\Program Files\nodejs\node.exe'
$services=@(
 @{Name='payment';File='powershell.exe';Args='-NoProfile -ExecutionPolicy Bypass -File "'+(Join-Path $botsRoot 'Payment-bot\PAYMENT-BOT-CONTROL.ps1')+'"';Match=Join-Path $botsRoot 'Payment-bot\PAYMENT-BOT-CONTROL.ps1';Root=Join-Path $botsRoot 'Payment-bot'},
 @{Name='telegram';File=$python;Args='"'+(Join-Path $botsRoot 'main.py')+'"';Match=Join-Path $botsRoot 'main.py';Root=$botsRoot},
 @{Name='preview';File=$node;Args='"'+(Join-Path $siteRoot 'scripts\serve-desktop-web.cjs')+'"';Match=Join-Path $siteRoot 'scripts\serve-desktop-web.cjs';Root=$siteRoot}
)
foreach($service in $services){
 if(-not(Test-Path -LiteralPath $service.Match)){throw "Missing service file: $($service.Match)"}
 if($service.File -ne 'powershell.exe' -and -not(Test-Path -LiteralPath $service.File)){throw "Missing runtime: $($service.File)"}
 if($CheckOnly){Write-Output "READY: $($service.Name)";continue}
 $existing=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -and $_.CommandLine.Contains($service.Match)} | Select-Object -First 1
 if($existing){Write-Output "Already running: $($service.Name)";continue}
 if($service.Name -eq 'preview' -and (Get-NetTCPConnection -LocalPort 4178 -State Listen -ErrorAction SilentlyContinue)){Write-Output 'Preview port 4178 is already in use; no process was stopped.';continue}
 New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
 $process=Start-Process -FilePath $service.File -ArgumentList $service.Args -WorkingDirectory $service.Root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logRoot ($service.Name+'-out.log')) -RedirectStandardError (Join-Path $logRoot ($service.Name+'-error.log')) -PassThru
 Write-Output "Started: $($service.Name), PID $($process.Id)"
}
Write-Output 'Payment bot includes Firebase checkout, support bridge, invoices and security notifications.'
