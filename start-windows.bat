@echo off
REM // BUILT BY SB // RUNING ON WEED AND CAFFEINE
cd /d "%~dp0"
if not exist ".env" (
  echo Please set up .env first. Copy .env.example to .env and add your Discord credentials.
  pause
  exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22.13 or newer is required. Install Node.js 24 LTS.
  pause
  exit /b 1
)
echo Starting SB's ^& Cam's Store Community V1.2.1...
npm.cmd run dev
pause
