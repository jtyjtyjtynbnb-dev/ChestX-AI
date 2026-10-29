@echo off
setlocal EnableExtensions
set "PROJECT_ROOT=%~dp0.."
cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
  echo ERROR: Cannot enter the project folder.
  pause
  exit /b 1
)
set "PYTHONPATH=%PROJECT_ROOT%;%PYTHONPATH%"
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  if errorlevel 1 (
    echo ERROR: Could not create .venv. Use the root start.bat instead.
    pause
    exit /b 1
  )
  call ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r "%~dp0requirements.txt"
)
call ".venv\Scripts\python.exe" -m uvicorn backend.main:app --app-dir "%PROJECT_ROOT%" --host 127.0.0.1 --port 8000
