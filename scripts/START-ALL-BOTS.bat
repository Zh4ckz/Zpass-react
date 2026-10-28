@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START-ALL-BOTS.ps1" %*
if errorlevel 1 (
  echo Startup failed. Check runtime-logs.
  pause
)
