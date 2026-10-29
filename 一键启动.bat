@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "RUN_ROOT=%~dp0"
set "APP_DIR=%RUN_ROOT%"
if "%APP_DIR:~-1%"=="\" set "APP_DIR=%APP_DIR:~0,-1%"
if not defined CHESTX_API_PORT set "CHESTX_API_PORT=8000"
cd /d "%RUN_ROOT%"
if errorlevel 1 (
  echo ERROR: Cannot enter the run package folder.
  pause
  exit /b 1
)

if not exist "%RUN_ROOT%backend\model.onnx" (
  echo ERROR: backend\model.onnx was not found.
  pause
  exit /b 1
)
if not exist "%RUN_ROOT%backend\workflow.py" (
  echo ERROR: Agent workflow is missing from this run package.
  pause
  exit /b 1
)
if not exist "%RUN_ROOT%frontend\dist\index.html" (
  echo ERROR: frontend\dist\index.html was not found. Run npm run build in frontend first.
  pause
  exit /b 1
)

REM ---------------------------------------------------------------------------
REM 1. Locate a usable Python 3.10+ interpreter (prefer the local .venv).
REM ---------------------------------------------------------------------------
set "PYTHON_EXE="
set "USING_VENV="
if exist "%RUN_ROOT%.venv\Scripts\python.exe" (
  "%RUN_ROOT%.venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_EXE=%RUN_ROOT%.venv\Scripts\python.exe"
    set "USING_VENV=1"
  )
)

if not defined PYTHON_EXE (
  where py >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CANDIDATE="
    for /f "delims=" %%P in ('py -3 -c "import sys;print(sys.executable)" 2^>nul') do set "PYTHON_CANDIDATE=%%P"
    if defined PYTHON_CANDIDATE (
      "!PYTHON_CANDIDATE!" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
      if not errorlevel 1 set "PYTHON_EXE=!PYTHON_CANDIDATE!"
    )
  )
)

if not defined PYTHON_EXE (
  where python >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CANDIDATE="
    for /f "delims=" %%P in ('python -c "import sys;print(sys.executable)" 2^>nul') do set "PYTHON_CANDIDATE=%%P"
    if defined PYTHON_CANDIDATE (
      "!PYTHON_CANDIDATE!" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
      if not errorlevel 1 set "PYTHON_EXE=!PYTHON_CANDIDATE!"
    )
  )
)

if not defined PYTHON_EXE (
  echo ERROR: Python 3.10 or newer was not found.
  echo Install Python 3.10+ from https://www.python.org/downloads/ and enable "Add Python to PATH".
  pause
  exit /b 1
)

REM ---------------------------------------------------------------------------
REM 2. Check runtime dependencies; install them into a local .venv on demand.
REM ---------------------------------------------------------------------------
"%PYTHON_EXE%" -c "import fastapi, uvicorn, cv2, onnxruntime, langgraph, httpx, PIL" >nul 2>nul
if errorlevel 1 (
  echo Python dependencies are missing. Preparing a local .venv...
  if not defined USING_VENV (
    echo Creating local .venv ...
    "%PYTHON_EXE%" -m venv --clear "%RUN_ROOT%.venv"
    if errorlevel 1 (
      echo ERROR: Could not create .venv. Check disk permissions and Python installation.
      pause
      exit /b 1
    )
    set "PYTHON_EXE=%RUN_ROOT%.venv\Scripts\python.exe"
  )
  echo Installing requirements from backend\requirements.txt ...
  echo This may take several minutes on first run and requires network access.
  "!PYTHON_EXE!" -m pip install --disable-pip-version-check --no-input --prefer-binary --timeout 20 --retries 1 -r "%RUN_ROOT%backend\requirements.txt"
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    echo Check your network/proxy, then retry the launcher.
    echo Offline option: pre-install requirements into .venv on a networked machine and copy the folder.
    pause
    exit /b 1
  )
  "!PYTHON_EXE!" -c "import fastapi, uvicorn, cv2, onnxruntime, langgraph, httpx, PIL" >nul 2>nul
  if errorlevel 1 (
    echo ERROR: Dependencies are still incomplete after installation.
    pause
    exit /b 1
  )
  echo Dependencies installed successfully.
)

set "PYTHONPATH=%RUN_ROOT%;%PYTHONPATH%"
set "HEALTH_URL=http://127.0.0.1:%CHESTX_API_PORT%/api/health"
where curl >nul 2>nul
if errorlevel 1 (
  echo ERROR: curl is required to check whether the backend is ready.
  pause
  exit /b 1
)

REM ---------------------------------------------------------------------------
REM 3. Reuse a healthy ChestX-AI backend, otherwise start a new one.
REM ---------------------------------------------------------------------------
set "BACKEND_REUSE="
set "HEALTH_RESPONSE="
for /f "delims=" %%A in ('curl --silent --fail "%HEALTH_URL%" 2^>nul') do set "HEALTH_RESPONSE=%%A"
echo %HEALTH_RESPONSE%| findstr /i /c:"chestx-ai" >nul 2>nul
if not errorlevel 1 set "BACKEND_REUSE=1"
if not defined BACKEND_REUSE curl --silent --fail "%HEALTH_URL%" >nul 2>nul
if not defined BACKEND_REUSE if not errorlevel 1 (
  echo ERROR: Port %CHESTX_API_PORT% is already serving an API. Set CHESTX_API_PORT to another port and retry.
  pause
  exit /b 1
)

if defined BACKEND_REUSE (
  echo Reusing existing ChestX-AI backend on port %CHESTX_API_PORT%...
) else (
  echo Starting backend on port %CHESTX_API_PORT%...
  start "ChestX-AI Backend" /b "%PYTHON_EXE%" -m uvicorn backend.main:app --app-dir "%APP_DIR%" --host 127.0.0.1 --port %CHESTX_API_PORT%
)

set "READY="
for /L %%I in (1,1,20) do (
  curl --silent --fail "%HEALTH_URL%" >nul 2>nul
  if not errorlevel 1 set "READY=1"
  if defined READY goto backend_ready
  ping -n 2 127.0.0.1 >nul
)

:backend_ready
if not defined READY (
  echo ERROR: Backend did not become healthy within 20 seconds.
  echo Check Python dependencies, model availability, and port %CHESTX_API_PORT%.
  pause
  exit /b 1
)

if not defined CHESTX_NO_BROWSER start "" "http://127.0.0.1:%CHESTX_API_PORT%/"
echo ChestX-AI is ready at http://127.0.0.1:%CHESTX_API_PORT%/
echo Keep this window open while using the demo.
if not defined CHESTX_NO_PAUSE pause
