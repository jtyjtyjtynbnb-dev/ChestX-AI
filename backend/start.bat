@echo off
setlocal
set "PROJECT_ROOT=%~dp0..\.."
cd /d "%PROJECT_ROOT%"
set "PYTHONPATH=%~dp0..;%PYTHONPATH%"
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  call ".venv\Scripts\python.exe" -m pip install -r "%~dp0requirements.txt"
)
call ".venv\Scripts\python.exe" -m uvicorn backend.main:app --app-dir "%~dp0.." --host 127.0.0.1 --port 8000
