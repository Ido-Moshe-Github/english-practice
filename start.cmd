@echo off
REM One-command launcher for Windows: installs what's needed, then starts the app.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required but wasn't found.
  echo Install the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies - this only happens the first time...
  call npm install --no-audit --no-fund
  echo.
)

echo Starting... the app will open at http://localhost:5173
echo Press Ctrl-C to stop.
echo.
call npm run dev
