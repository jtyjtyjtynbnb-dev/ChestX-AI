@echo off
chcp 65001 >nul
title ChestX-AI One-Click Launcher
setlocal
cd /d "%~dp0"

if not exist "start.bat" (
  echo ERROR: start.bat was not found next to this launcher.
  echo Please extract the whole ZIP before running.
  pause
  exit /b 1
)

echo Starting ChestX-AI...
call "%~dp0start.bat"
exit /b %errorlevel%
