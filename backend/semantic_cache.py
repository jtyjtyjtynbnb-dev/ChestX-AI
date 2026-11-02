"""Small in-process semantic cache for AI chat answers.

Exact normalized questions are hashed first. A BGE query embedding is then
compared with cached questions for the same diagnosis context; no network is
used. The cache never stores images or DICOM data.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
import threading
import time

import numpy as np

from .rag.dense import dense_query_vector


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip().lower()


def _context_key(context: dict | None) -> str:
    context = context or {}
    compact = {
        "risk": context.get("risk_label") or context.get("risk") or "",
        "member": context.get("memberId") or context.get("member_id") or "",
        "probabilities": [
            [item.get("code"), round(float(item.get("prob") or 0), 1)]
            for item in (context.get("probabilities") or [])[:5]
            if isinstance(item, dict)
        ],
        "summary": str(context.get("summary") or "")[:160],
    }
    return hashlib.sha256(json.dumps(compact, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


class SemanticAnswerCache:
    def __init__(self, maxsize: int = 48, ttl_seconds: int = 900, threshold: float = 0.92):
        self.maxsize = maxsize
        self.ttl_seconds = ttl_seconds
        self.threshold = threshold
        self._items: list[dict] = []
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def _fresh(self) -> list[dict]:
        now = time.time()
        self._items = [item for item in self._items if now - item["created"] <= self.ttl_seconds]
        return self._items

    def get(self, question: str, context: dict | None = None) -> dict | None:
        normalized = _normalize(question)
        if not normalized:
            return None
        context_key = _context_key(context)
        with self._lock:
            items = self._fresh()
            exact = next((item for item in reversed(items) if item["context"] == context_key and item["question"] == normalized), None)
            if exact is not None:
                self.hits += 1
                return copy.deepcopy(exact["answer"])
            vector = dense_query_vector(normalized)
            if vector is None:
                self.misses += 1
                return None
            best = None
            best_score = -1.0
            for item in reversed(items):
                if item["context"] != context_key or item.get("vector") is None:
                    continue
                score = float(np.dot(vector, item["vector"]))
                if score > best_score:
                    best, best_score = item, score
            if best is not None and best_score >= self.threshold:
                self.hits += 1
                return copy.deepcopy(best["answer"])
            self.misses += 1
            return None

    def set(self, question: str, answer: dict, context: dict | None = None) -> None:
        normalized = _normalize(question)
        if not normalized or not isinstance(answer, dict):
            return
        vector = dense_query_vector(normalized)
        item = {
            "question": normalized,
            "context": _context_key(context),
            "answer": copy.deepcopy(answer),
            "created": time.time(),
            "vector": vector,
        }
        with self._lock:
            self._fresh()
            self._items.append(item)
            while len(self._items) > self.maxsize:
                self._items.pop(0)
