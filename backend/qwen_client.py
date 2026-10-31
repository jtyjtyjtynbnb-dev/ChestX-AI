"""DashScope text client for local-first chat and evidence reports."""

import asyncio
import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx


DEFAULT_CHAT_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DEFAULT_MODEL = "qwen3.8-flash"
ENV_PATH = Path(__file__).resolve().parent / ".env"
_runtime_api_key: str | None = None
_runtime_model: str | None = None


def _load_env_file() -> None:
    """Load backend/.env into the process environment without extra dependencies.

    Existing environment variables always win, so a shell-provided key can
    override the local file. Invalid lines are ignored instead of failing
    application startup.
    """
    if not ENV_PATH.is_file():
        return
    try:
        lines = ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
    except OSError:
        return
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        name, value = stripped.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if name and name not in os.environ:
            os.environ[name] = value


_load_env_file()


def _persist_env_config(api_key: str | None, model: str | None) -> None:
    """Safely update DASHSCOPE_API_KEY and QWEN_MODEL in backend/.env."""
    try:
        lines: list[str] = []
        if ENV_PATH.is_file():
            lines = ENV_PATH.read_text(encoding="utf-8", errors="ignore").splitlines()
        updated_keys: set[str] = set()
        new_lines: list[str] = []
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                new_lines.append(line)
                continue
            k, _ = stripped.split("=", 1)
            key_name = k.strip()
            if key_name == "DASHSCOPE_API_KEY" and api_key is not None:
                new_lines.append(f"DASHSCOPE_API_KEY={api_key}")
                updated_keys.add("DASHSCOPE_API_KEY")
            elif key_name == "QWEN_MODEL" and model is not None:
                new_lines.append(f"QWEN_MODEL={model}")
                updated_keys.add("QWEN_MODEL")
            else:
                new_lines.append(line)
        if api_key is not None and "DASHSCOPE_API_KEY" not in updated_keys:
            new_lines.append(f"DASHSCOPE_API_KEY={api_key}")
        if model is not None and "QWEN_MODEL" not in updated_keys:
            new_lines.append(f"QWEN_MODEL={model}")
        ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except OSError:
        pass


def set_runtime_config(api_key: str | None, model: str | None = None, persist: bool = True) -> None:
    """Keep UI-provided credentials in process memory and optionally persist to backend/.env."""
    global _runtime_api_key, _runtime_model
    _runtime_api_key = api_key.strip() if api_key and api_key.strip() else None
    _runtime_model = model.strip() if model and model.strip() else None
    if persist:
        _persist_env_config(_runtime_api_key or "", _runtime_model or DEFAULT_MODEL)


def runtime_config_status() -> dict[str, Any]:
    key = _runtime_api_key if _runtime_api_key is not None else os.getenv("DASHSCOPE_API_KEY", "").strip()
    model = _runtime_model or os.getenv("QWEN_MODEL", DEFAULT_MODEL)
    return {"configured": bool(key), "model": model}


def parse_report_content(content: str) -> dict[str, Any]:
    """Parse JSON returned by Qwen, tolerating an accidental code fence."""
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```")
        cleaned = cleaned.removesuffix("```").strip()
    parsed = json.loads(cleaned)
    if not isinstance(parsed, dict):
        raise ValueError("Qwen report must be a JSON object")
    return parsed


class DashScopeError(RuntimeError):
    """Safe, classified error without provider body or credentials."""


class DashScopeQwenClient:
    def __init__(self, transport=None) -> None:
        self.transport = transport
        self.api_key = (_runtime_api_key if _runtime_api_key is not None else os.getenv("DASHSCOPE_API_KEY", "")).strip()
        self.model = _runtime_model or os.getenv("QWEN_MODEL", DEFAULT_MODEL)
        self.chat_endpoint = os.getenv("DASHSCOPE_CHAT_ENDPOINT", DEFAULT_CHAT_ENDPOINT)
        self.timeout_seconds = float(os.getenv("QWEN_TIMEOUT_SECONDS", "30"))
        url = urlparse(self.chat_endpoint)
        if url.scheme != 'https' or not (url.hostname or '').endswith('.aliyuncs.com'):
            raise ValueError('Use an HTTPS DashScope aliyuncs.com endpoint')
        self.origin = f'{url.scheme}://{url.netloc}'
        self.last_usage = {}

    def enabled(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def _extract_compatible_text(body: dict[str, Any]) -> str:
        choices = body.get("choices") or []
        if not choices:
            raise ValueError("DashScope response did not contain choices")
        content = choices[0].get("message", {}).get("content", "")
        if isinstance(content, str):
            return content
        for part in content or []:
            if isinstance(part, dict) and part.get("text"):
                return str(part["text"])
        raise ValueError("DashScope response did not contain message text")

    async def generate_chat(self, prompt: str, max_tokens: int = 1000) -> str:
        """Generate a plain-text answer using the configured Qwen model."""
        if not self.enabled():
            raise DashScopeError("not_configured")
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }
        body = await self.post_json(self.chat_endpoint, payload)
        self.last_usage = body.get("usage", {})
        choices = body.get("choices", [])
        if choices and choices[0].get("finish_reason") == "length":
            raise DashScopeError("truncated_output")
        return self._extract_compatible_text(body)

    async def stream_chat(self, prompt: str) -> AsyncIterator[str]:
        """Yield incremental text chunks from Qwen chat generation."""
        text = await self.generate_chat(prompt)
        chunk_size = 10
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]
            await asyncio.sleep(0.01)

    async def post_json(self, endpoint: str, payload: dict) -> dict:
        if not self.enabled():
            raise DashScopeError('not_configured')
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=self.timeout_seconds, transport=self.transport) as client:
            for attempt in range(2):
                try:
                    response = await client.post(endpoint, headers=headers, json=payload)
                    response.raise_for_status()
                    body = response.json()
                    if body.get('code'):
                        raise DashScopeError('provider_error')
                    return body
                except httpx.HTTPStatusError as exc:
                    status = exc.response.status_code
                    if status in (401, 403):
                        raise DashScopeError('authentication') from None
                    if attempt == 0 and (status == 429 or status >= 500):
                        await asyncio.sleep(0.5)
                        continue
                    if status == 429:
                        raise DashScopeError('rate_limited') from None
                    provider_code = ''
                    try:
                        raw_code = exc.response.json().get('code', '')
                        if isinstance(raw_code, str) and raw_code and len(raw_code) <= 80:
                            provider_code = ''.join(char for char in raw_code if char.isalnum() or char in {'_', '-'})
                    except ValueError:
                        pass
                    suffix = f'_{provider_code}' if provider_code else ''
                    raise DashScopeError(f'provider_http_{status}{suffix}') from None
                except (httpx.TimeoutException, httpx.NetworkError):
                    # Do not retry timeouts: a retried 30s timeout would block the
                    # analysis request for ~60s before the local report fallback.
                    raise DashScopeError('network_timeout') from None
        raise DashScopeError('unavailable')

    async def embed(self, texts: list[str]) -> list[list[float]]:
        body = await self.post_json(self.origin + '/api/v1/services/embeddings/text-embedding/text-embedding', {
            'model': os.getenv('QWEN_EMBED_MODEL', 'text-embedding-v3'),
            'input': {'texts': texts},
            'parameters': {'text_type': 'document', 'dimension': 1024},
        })
        rows = sorted(body['output']['embeddings'], key=lambda r: r['text_index'])
        if len(rows) != len(texts):
            raise DashScopeError('invalid_embeddings')
        return [row['embedding'] for row in rows]

    async def rerank(self, query: str, documents: list[str]) -> list[dict]:
        body = await self.post_json(self.origin + '/api/v1/services/rerank/text-rerank/text-rerank', {
            'model': os.getenv('QWEN_RERANK_MODEL', 'gte-rerank-v2'),
            'input': {'query': query, 'documents': documents},
            'parameters': {'return_documents': False, 'top_n': len(documents)},
        })
        return body['output']['results']
