#!/usr/bin/env bash
set -euo pipefail

RUN_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$RUN_ROOT"
CHESTX_API_PORT="${CHESTX_API_PORT:-8000}"
export CHESTX_API_PORT
export PYTHONPATH="$RUN_ROOT${PYTHONPATH:+:$PYTHONPATH}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "未找到 python3，请先安装 Python 3.10 或更高版本。"
  exit 1
fi

if [ ! -x ".venv/bin/python" ]; then
  echo "正在创建运行环境..."
  python3 -m venv .venv
  echo "正在安装依赖，首次启动可能需要几分钟..."
  .venv/bin/python -m pip install -r backend/requirements.txt
fi

if [ ! -f "backend/model.onnx" ]; then
  echo "未找到模型文件：backend/model.onnx"
  exit 1
fi

echo "正在启动 ChestX-AI 后端..."
.venv/bin/python -m uvicorn backend.main:app --app-dir "$RUN_ROOT" --host 127.0.0.1 --port "$CHESTX_API_PORT" > backend/server.log 2>&1 &
SERVER_PID=$!
echo "$SERVER_PID" > backend/server.pid
sleep 2

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$RUN_ROOT/frontend/index.html?api=http://127.0.0.1:$CHESTX_API_PORT" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "$RUN_ROOT/frontend/index.html?api=http://127.0.0.1:$CHESTX_API_PORT"
fi

echo "已启动：http://127.0.0.1:$CHESTX_API_PORT"
echo "后端 PID: $SERVER_PID，日志：backend/server.log"
