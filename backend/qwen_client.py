"""Native DashScope multimodal client for Qwen-VL report generation."""

import asyncio
import base64
import io
import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx
from PIL import Image


DEFAULT_ENDPOINT = (
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/"
    "multimodal-generation/generation"
)
DEFAULT_CHAT_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DEFAULT_MODEL = "qwen3.8-flash"
ENV_PATH = Path(__file__).resolve().parent / ".env"
_runtime_api_key: str | None = None
_runtime_model: str | None = None


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
        self.endpoint = os.getenv("DASHSCOPE_ENDPOINT", DEFAULT_ENDPOINT)
        self.chat_endpoint = os.getenv("DASHSCOPE_CHAT_ENDPOINT", DEFAULT_CHAT_ENDPOINT)
        self.timeout_seconds = float(os.getenv("QWEN_TIMEOUT_SECONDS", "45"))
        url = urlparse(self.endpoint)
        if url.scheme != 'https' or not (url.hostname or '').endswith('.aliyuncs.com') or '/compatible-mode/' in url.path:
            raise ValueError('Use a native HTTPS DashScope aliyuncs.com endpoint')
        self.origin = f'{url.scheme}://{url.netloc}'
        self.last_usage = {}

    def enabled(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def image_to_data_url(image: Image.Image) -> str:
        image = image.convert("RGB")
        image.thumbnail((1600, 1600))
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=85, optimize=True)
        encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
        return f"data:image/jpeg;base64,{encoded}"

    async def generate_report(
        self,
        image: Image.Image,
        prompt: str,
    ) -> dict[str, Any]:
        if not self.enabled():
            raise RuntimeError("DASHSCOPE_API_KEY is not configured")

        body = await self.post_json(self.chat_endpoint, self.build_compatible_payload(image, prompt))
        self.last_usage = body.get('usage', {})
        choices = body.get('choices', [])
        if choices and choices[0].get('finish_reason') == 'length':
            raise DashScopeError('truncated_output')
        return parse_report_content(self._extract_compatible_text(body))

    def build_compatible_payload(self, image: Image.Image, prompt: str) -> dict[str, Any]:
        return {
            "model": self.model,
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": self.image_to_data_url(image)}},
                    {"type": "text", "text": prompt},
                ],
            }],
            "temperature": 0.1,
            "max_tokens": 1600,
        }

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

    async def generate_chat(self, prompt: str) -> str:
        """Generate a plain-text answer using the configured Qwen model."""
        if not self.enabled():
            raise DashScopeError("not_configured")
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 1000,
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
                    if attempt == 0:
                        await asyncio.sleep(0.5)
                        continue
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
