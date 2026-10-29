@echo off
setlocal
set "PREVIEW_SCRIPT=C:\Users\rezan\Documents\Codex\2026-10-20\me\outputs\ZPass-local-preview.cjs"
set "NODE_EXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODE_EXE%" set "NODE_EXE=C:\Users\rezan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" (
  echo Node.js bulunamadi. Node.js kurulumunu kontrol edin.
  pause
  exit /b 1
)
if not exist "%PREVIEW_SCRIPT%" (
  echo Yerel onizleme dosyasi bulunamadi:
  echo %PREVIEW_SCRIPT%
  pause
  exit /b 1
)
powershell -NoProfile -Command "try{$r=Invoke-WebRequest 'http://127.0.0.1:4178/web.html?preview=1' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200 -and $r.Content.Contains('id=\"view-qr\"')){exit 0}}catch{}; exit 1"
if errorlevel 1 (
  start "Z Pass Local Preview" /min "%NODE_EXE%" "%PREVIEW_SCRIPT%"
  echo Yerel sunucu baslatiliyor...
  powershell -NoProfile -Command "for($i=0;$i -lt 30;$i++){try{$r=Invoke-WebRequest 'http://127.0.0.1:4178/web.html?preview=1' -UseBasicParsing -TimeoutSec 1; if($r.StatusCode -eq 200 -and $r.Content.Contains('id=\"view-qr\"')){exit 0}}catch{}; Start-Sleep -Milliseconds 500}; exit 1"
  if errorlevel 1 (
    echo Yerel QR onizlemesi baslatilamadi. Sunucu penceresindeki hata mesajini kontrol edin.
    pause
    exit /b 1
  )
) else (
  echo Yerel onizleme sunucusu zaten calisiyor.
)
start "" "http://127.0.0.1:4178/web.html?preview=1"
echo Z Pass QR giris onizlemesi tarayicida acildi.
echo Adres: http://127.0.0.1:4178/web.html?preview=1
echo Sunucuyu kapatmak icin "Z Pass Local Preview" penceresini kapatin.
