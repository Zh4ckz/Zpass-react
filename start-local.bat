@echo off
title Z Pass Local Web Server
cd /d "%~dp0"
echo ===================================================
echo 🚀 Starting local Z Pass server at http://localhost:5000
echo ===================================================
python -m http.server 5000 --directory public
pause
