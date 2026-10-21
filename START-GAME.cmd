@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. See README.md.
  pause
  exit /b 1
)
node tools\serve.mjs --open
if errorlevel 1 pause
