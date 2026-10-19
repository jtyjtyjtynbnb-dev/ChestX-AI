@echo off
setlocal EnableExtensions

set "RUN_ROOT=%~dp0"
if not defined CHESTX_API_PORT set "CHESTX_API_PORT=8000"
if not defined CHESTX_FRONTEND_PORT set "CHESTX_FRONTEND_PORT=8765"
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
if not exist "%RUN_ROOT%frontend\index.html" (
  echo ERROR: frontend\index.html was not found.
  pause
  exit /b 1
)

set "PYTHON_EXE="
set "PYTHON_BOOTSTRAP="
where py >nul 2>nul
if not errorlevel 1 (
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
  if not errorlevel 1 set "PYTHON_BOOTSTRAP=py -3"
)
where python >nul 2>nul
if not errorlevel 1 (
  python -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_BOOTSTRAP=python"
    python -c "import fastapi, uvicorn, cv2, onnxruntime, langgraph" >nul 2>nul
    if not errorlevel 1 set "PYTHON_EXE=python"
  )
)

if not defined PYTHON_EXE if exist "%RUN_ROOT%.venv\Scripts\python.exe" (
  "%RUN_ROOT%.venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul
  if not errorlevel 1 (
    "%RUN_ROOT%.venv\Scripts\python.exe" -c "import fastapi, uvicorn, cv2, onnxruntime, langgraph" >nul 2>nul
    if not errorlevel 1 set "PYTHON_EXE=%RUN_ROOT%.venv\Scripts\python.exe"
  )
)

if not defined PYTHON_EXE (
  if not defined PYTHON_BOOTSTRAP (
    echo ERROR: Python 3.10 or newer was not found.
    pause
    exit /b 1
  )
  echo Creating or repairing the local virtual environment...
  %PYTHON_BOOTSTRAP% -m venv --clear "%RUN_ROOT%.venv"
  if errorlevel 1 (
    echo ERROR: Failed to create the virtual environment.
    pause
    exit /b 1
  )
  echo Installing dependencies. This may take a few minutes on first run...
  "%RUN_ROOT%.venv\Scripts\python.exe" -m pip install --upgrade pip
  if errorlevel 1 (
    echo ERROR: Failed to prepare pip.
    pause
    exit /b 1
  )
  "%RUN_ROOT%.venv\Scripts\python.exe" -m pip install --no-cache-dir -r "%RUN_ROOT%backend\requirements.txt"
  if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
  )
  set "PYTHON_EXE=%RUN_ROOT%.venv\Scripts\python.exe"
)

set "PYTHONPATH=%RUN_ROOT%;%PYTHONPATH%"
if exist "%RUN_ROOT%backend\.env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in ("%RUN_ROOT%backend\.env") do if not "%%A"=="" set "%%A=%%B"
)
set "HEALTH_URL=http://127.0.0.1:%CHESTX_API_PORT%/api/health"
set "FRONTEND_URL=http://127.0.0.1:%CHESTX_FRONTEND_PORT%/index.html?api=http://127.0.0.1:%CHESTX_API_PORT%"
where curl >nul 2>nul
if errorlevel 1 (
  echo ERROR: curl is required to check whether the backend is ready.
  pause
  exit /b 1
)
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

:check_frontend_port
set "FRONTEND_REUSE="
curl --silent --fail "http://127.0.0.1:%CHESTX_FRONTEND_PORT%/index.html" 2>nul | findstr /i /c:"ChestX-AI" >nul 2>nul
if not errorlevel 1 set "FRONTEND_REUSE=1"
if defined FRONTEND_REUSE goto frontend_port_ready
netstat -ano | findstr /r /c:":%CHESTX_FRONTEND_PORT% .*LISTENING" >nul 2>nul
if errorlevel 1 goto frontend_port_ready
echo Port %CHESTX_FRONTEND_PORT% is occupied; trying the next frontend port...
set /a CHESTX_FRONTEND_PORT+=1
set "FRONTEND_URL=http://127.0.0.1:%CHESTX_FRONTEND_PORT%/index.html?api=http://127.0.0.1:%CHESTX_API_PORT%"
goto check_frontend_port

:frontend_port_ready

if defined BACKEND_REUSE (
  echo Reusing existing ChestX-AI backend on port %CHESTX_API_PORT%...
) else (
  echo Starting backend on port %CHESTX_API_PORT%...
  start "ChestX-AI Backend" /b "%PYTHON_EXE%" -m uvicorn backend.main:app --app-dir "%RUN_ROOT%" --host 127.0.0.1 --port %CHESTX_API_PORT%
)

set "READY="
for /L %%I in (1,1,20) do (
  curl --silent --fail "%HEALTH_URL%" >nul 2>nul
  if not errorlevel 1 set "READY=1"
  if defined READY goto backend_ready
  timeout /t 1 /nobreak >nul
)

:backend_ready
if not defined READY (
  echo ERROR: Backend did not become healthy within 20 seconds.
  echo Check Python dependencies, model availability, and port %CHESTX_API_PORT%.
  pause
  exit /b 1
)

if defined FRONTEND_REUSE (
  echo Reusing existing ChestX-AI frontend on port %CHESTX_FRONTEND_PORT%...
) else (
  echo Starting frontend on port %CHESTX_FRONTEND_PORT%...
  start "ChestX-AI Frontend" /b "%PYTHON_EXE%" -m http.server %CHESTX_FRONTEND_PORT% --bind 127.0.0.1 --directory "%RUN_ROOT%frontend"
)
set "FRONTEND_READY="
for /L %%I in (1,1,10) do (
  curl --silent --fail "http://127.0.0.1:%CHESTX_FRONTEND_PORT%/index.html" >nul 2>nul
  if not errorlevel 1 set "FRONTEND_READY=1"
  if defined FRONTEND_READY goto frontend_ready
  timeout /t 1 /nobreak >nul
)

:frontend_ready
if not defined FRONTEND_READY (
  echo ERROR: Frontend did not become ready within 10 seconds.
  pause
  exit /b 1
)
start "" "%FRONTEND_URL%"
echo ChestX-AI is ready at %FRONTEND_URL%
echo Keep this window open while using the demo.
pause
