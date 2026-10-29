#!/usr/bin/env bash
set -euo pipefail

RUN_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$RUN_ROOT"
CHESTX_API_PORT="${CHESTX_API_PORT:-8000}"
export CHESTX_API_PORT
export PYTHONPATH="$RUN_ROOT${PYTHONPATH:+:$PYTHONPATH}"

if [ ! -f "frontend/dist/index.html" ]; then
  echo "错误：缺少 frontend/dist/index.html，请先在 frontend 目录执行 npm run build。"
  exit 1
fi
if [ ! -f "backend/model.onnx" ]; then
  echo "错误：未找到 backend/model.onnx。"
  exit 1
fi

PYTHON_EXE="python3"
if [ -x ".venv/bin/python" ]; then PYTHON_EXE=".venv/bin/python"; fi
if ! command -v "$PYTHON_EXE" >/dev/null 2>&1 && [ ! -x "$PYTHON_EXE" ]; then
  echo "错误：未找到 Python 3.10 或更高版本。"
  exit 1
fi

echo "正在启动 ChestX-AI（单端口 $CHESTX_API_PORT）..."
"$PYTHON_EXE" -m uvicorn backend.main:app --app-dir "$RUN_ROOT" --host 127.0.0.1 --port "$CHESTX_API_PORT" > backend/server.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${CHESTX_API_PORT}/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! curl -fsS "http://127.0.0.1:${CHESTX_API_PORT}/api/health" >/dev/null 2>&1; then
  echo "错误：FastAPI 未能在 30 秒内启动，请查看 backend/server.log。"
  exit 1
fi

URL="http://127.0.0.1:${CHESTX_API_PORT}/"
if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then open "$URL"; fi
echo "已启动：$URL"
wait "$SERVER_PID"
