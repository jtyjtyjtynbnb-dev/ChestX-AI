"""Offline Chinese semantic index for the local RAG evidence base.

The model is BAAI/bge-small-zh-v1.5 exported to ONNX (95 MB external weights).
It runs through ONNX Runtime and is optional: if files are missing, the caller
falls back to BM25/TF-IDF only.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

try:
    import onnxruntime as ort
    from tokenizers import Tokenizer
except ImportError:  # pragma: no cover - optional local dependency
    ort = None
    Tokenizer = None

MODEL_DIR = Path(__file__).resolve().parent.parent / "models" / "bge-small-zh-v1.5"
MODEL_PATH = MODEL_DIR / "model.onnx"
TOKENIZER_PATH = MODEL_DIR / "tokenizer.json"
KNOWLEDGE_PATH = Path(__file__).with_name("knowledge.json")


class DenseIndex:
    def __init__(self) -> None:
        self._session = None
        self._tokenizer = None
        self._ids: list[str] = []
        self._vectors: np.ndarray | None = None
        self._failed = False

    def available(self) -> bool:
        return (
            not self._failed
            and ort is not None
            and Tokenizer is not None
            and MODEL_PATH.is_file()
            and TOKENIZER_PATH.is_file()
            and (MODEL_DIR / "model.onnx_data").is_file()
        )

    def _ensure(self) -> bool:
        if self._failed:
            return False
        if self._session is not None and self._vectors is not None:
            return True
        if not self.available():
            self._failed = True
            return False
        try:
            self._session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
            self._tokenizer = Tokenizer.from_file(str(TOKENIZER_PATH))
            self._tokenizer.enable_truncation(max_length=512)
            self._tokenizer.enable_padding(pad_id=0, pad_token="[PAD]")
            items = json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))
            texts = [f"{item.get('title', '')}\n{item.get('content', '')}" for item in items]
            self._ids = [str(item.get("id")) for item in items]
            self._vectors = self._encode(texts)
            self._vectors = self._vectors / np.maximum(np.linalg.norm(self._vectors, axis=1, keepdims=True), 1e-8)
            return True
        except Exception:
            self._failed = True
            self._session = None
            self._tokenizer = None
            return False

    def _encode(self, texts: list[str]) -> np.ndarray:
        encoded = self._tokenizer.encode_batch(texts)
        input_ids = np.asarray([item.ids for item in encoded], dtype=np.int64)
        attention = np.asarray([item.attention_mask for item in encoded], dtype=np.int64)
        token_types = np.zeros_like(input_ids)
        inputs = {
            "input_ids": input_ids,
            "attention_mask": attention,
            "token_type_ids": token_types,
        }
        outputs = self._session.run(["sentence_embedding"], inputs)[0]
        return np.asarray(outputs, dtype=np.float32)

    def query_vector(self, query: str) -> np.ndarray | None:
        if not query.strip() or not self._ensure():
            return None
        vector = self._encode([query])[0]
        return vector / max(float(np.linalg.norm(vector)), 1e-8)

    def scores(self, query: str) -> dict[str, float]:
        vector = self.query_vector(query)
        if vector is None:
            return {}
        cosine = self._vectors @ vector
        return {doc_id: float(score) for doc_id, score in zip(self._ids, cosine, strict=True)}


_INDEX = DenseIndex()


def dense_scores(query: str) -> dict[str, float]:
    return _INDEX.scores(query)


def dense_query_vector(query: str) -> np.ndarray | None:
    return _INDEX.query_vector(query)
