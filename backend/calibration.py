"""Post-hoc calibration and selective-prediction helpers.

Runtime uses backend/calibration.json when available. Without it, the previous
conservative heuristic remains active, so deployment never depends on running
the calibration script.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

CALIBRATION_PATH = Path(__file__).with_name("calibration.json")

DEFAULT_CONFIG = {
    "version": 1,
    "temperature": 1.0,
    "confidence": {
        "high_top_percent": 60.0,
        "low_top_percent": 25.0,
        "low_margin_percent": 5.0,
        "high_entropy": 0.62,
        "low_entropy": 0.82,
    },
    "selective": {
        "review_top_percent": 40.0,
        "review_margin_percent": 10.0,
        "target_coverage": 0.8,
    },
    "provenance": "default heuristic; run backend/calibrate_selective.py to fit",
}


def load_calibration(path: Path | None = None) -> dict:
    target = path or CALIBRATION_PATH
    try:
        payload = json.loads(target.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return DEFAULT_CONFIG
    if not isinstance(payload, dict):
        return DEFAULT_CONFIG
    merged = dict(DEFAULT_CONFIG)
    merged.update(payload)
    merged["confidence"] = {**DEFAULT_CONFIG["confidence"], **(payload.get("confidence") or {})}
    merged["selective"] = {**DEFAULT_CONFIG["selective"], **(payload.get("selective") or {})}
    return merged


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


def temperature_probabilities(logits: list[float], temperature: float) -> list[float]:
    safe_temperature = max(0.25, min(float(temperature or 1.0), 5.0))
    return [sigmoid(float(logit) / safe_temperature) for logit in logits]


def normalized_entropy(probabilities: list[float]) -> float:
    total = sum(probabilities)
    if total <= 0 or len(probabilities) <= 1:
        return 0.0
    entropy = -sum((value / total) * math.log(value / total + 1e-12) for value in probabilities if value > 0)
    return entropy / math.log(len(probabilities))


def assess(probabilities: list[dict], config: dict | None = None) -> dict:
    """Assess calibrated confidence; accepts items with a 0-100 `prob` field."""
    active = config or load_calibration()
    confidence = active.get("confidence") or {}
    values = sorted(
        [max(0.0, float(item.get("prob") or 0)) for item in probabilities if isinstance(item, dict)],
        reverse=True,
    )
    if not values:
        return {
            "level": "low",
            "label": "低置信",
            "top_probability": 0.0,
            "margin": 0.0,
            "entropy": 0.0,
            "needs_review": True,
            "reason": "没有可用的模型概率。",
        }
    top = values[0]
    second = values[1] if len(values) > 1 else 0.0
    margin = max(0.0, top - second)
    entropy = normalized_entropy([value / 100.0 for value in values])
    if (
        top >= float(confidence.get("high_top_percent", 60))
        and margin >= float(confidence.get("low_margin_percent", 5))
        and entropy <= float(confidence.get("high_entropy", 0.62))
    ):
        level, label, reason = "high", "高置信", "最高类别概率较高且与第二名有区分度。"
    elif (
        top < float(confidence.get("low_top_percent", 25))
        or margin < float(confidence.get("low_margin_percent", 5))
        or entropy > float(confidence.get("low_entropy", 0.82))
    ):
        level, label, reason = "low", "低置信", "类别间区分度不足，建议结合原始影像和医生复核。"
    else:
        level, label, reason = "medium", "中置信", "模型有一定倾向，但仍需结合临床和正式影像报告。"
    return {
        "level": level,
        "label": label,
        "top_probability": round(top, 1),
        "margin": round(margin, 1),
        "entropy": round(entropy, 3),
        "needs_review": level != "high",
        "reason": reason,
        "temperature": active.get("temperature", 1.0),
        "calibration_source": active.get("provenance", "default"),
    }
