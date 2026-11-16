# ChestX-AI maintenance: 输入防御：MobileNetV3 胸片/非胸片分类与启发式兜底，避免非胸片进入主模型。
"""Small binary guard that rejects non-chest images before DenseNet121.

The guard is a separately trained MobileNetV3-Small ONNX model. If the model or
ONNX Runtime is unavailable, callers fall back to the conservative heuristic in
image_quality.py; the diagnostic model must never be blocked by guard failures.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image

try:
    import onnxruntime as ort
except ImportError:  # pragma: no cover - deployment dependency is onnxruntime
    ort = None

MODEL_PATH = Path(__file__).with_name("guard_model.onnx")
THRESHOLD_PATH = Path(__file__).with_name("guard_threshold.json")
MEAN = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)
_session = None


def _load_session():
    global _session
    if _session is not None:
        return _session
    if ort is None or not MODEL_PATH.exists():
        return None
    _session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    return _session


def _thresholds() -> tuple[float, float]:
    try:
        data = json.loads(THRESHOLD_PATH.read_text(encoding="utf-8"))
        reject = float(data.get("reject_threshold", 0.5))
        warn = float(data.get("warn_threshold", reject * 0.7))
        if 0 < warn < reject <= 1:
            return reject, warn
    except (OSError, ValueError, TypeError):
        pass
    return 0.5, 0.35


def evaluate_guard(image: Image.Image) -> dict:
    """Return {available, decision, score, reason}; decision is accept/reject/ambiguous."""
    session = _load_session()
    if session is None:
        return {"available": False, "decision": "ambiguous", "score": None, "reason": "guard model unavailable"}
    array = np.asarray(image.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0
    array = (array - MEAN) / STD
    tensor = np.transpose(array, (2, 0, 1))[None, ...].astype(np.float32)
    try:
        output = session.run(None, {"input": tensor})[0]
        score = float(1.0 / (1.0 + np.exp(-float(np.asarray(output).reshape(-1)[0]))))
    except Exception:
        return {"available": False, "decision": "ambiguous", "score": None, "reason": "guard inference failed"}
    reject, warn = _thresholds()
    if score >= reject:
        return {
            "available": True,
            "decision": "reject",
            "score": round(score, 4),
            "reason": "检测到非胸片图像，未进行推理。请上传正位胸部X光片，勿上传人像、风景、报告截图或其他影像。",
        }
    if score < warn:
        return {"available": True, "decision": "accept", "score": round(score, 4), "reason": ""}
    return {"available": True, "decision": "ambiguous", "score": round(score, 4), "reason": "guard confidence is low"}
