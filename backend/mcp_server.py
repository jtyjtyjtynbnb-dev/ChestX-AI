# ChestX-AI maintenance: MCP stdio server：把本地工具暴露为 initialize/tools/list/tools/call。
"""Minimal MCP stdio server exposing the local tool registry.

Run: python -m backend.mcp_server
Protocol: JSON-RPC 2.0 over stdio (MCP initialize / tools/list / tools/call).
No network, no shell, no arbitrary file access.
"""

from __future__ import annotations

import json
import sys

from .tools import invoke_tool, tool_schemas


def _response(ident, result=None, error=None):
    payload = {"jsonrpc": "2.0", "id": ident}
    if error is not None:
        payload["error"] = error
    else:
        payload["result"] = result
    return payload


def _handle(message: dict) -> dict | None:
    method = message.get("method")
    ident = message.get("id")
    params = message.get("params") or {}
    if method == "initialize":
        return _response(ident, {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {"name": "chestx-ai-tools", "version": "0.1.0"},
        })
    if method in {"notifications/initialized", "initialized"}:
        return None
    if method == "ping":
        return _response(ident, {})
    if method == "tools/list":
        return _response(ident, {"tools": [
            {"name": tool["name"], "description": tool["description"], "inputSchema": tool["parameters"]}
            for tool in tool_schemas()
        ]})
    if method == "tools/call":
        name = params.get("name")
        arguments = params.get("arguments") or {}
        if not name:
            return _response(ident, error={"code": -32602, "message": "missing tool name"})
        try:
            result = invoke_tool(str(name), arguments)
            return _response(ident, {"content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}], "isError": False})
        except Exception as exc:
            return _response(ident, {"content": [{"type": "text", "text": str(exc)}], "isError": True})
    return _response(ident, error={"code": -32601, "message": f"method not found: {method}"})


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            message = json.loads(line)
            response = _handle(message)
            if response is not None:
                sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
                sys.stdout.flush()
        except Exception as exc:
            sys.stdout.write(json.dumps(_response(None, error={"code": -32700, "message": str(exc)}), ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
