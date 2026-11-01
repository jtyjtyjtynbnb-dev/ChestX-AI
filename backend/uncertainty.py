"""Lightweight uncertainty and selective-prediction helpers."""

from __future__ import annotations

import math


def _normalized_entropy(values: list[float]) -> float:
    total = sum(values)
    if total <= 0 or len(values) <= 1:
        return 0.0
    entropy = -sum((value / total) * math.log(value / total + 1e-12) for value in values if value > 0)
    return entropy / math.log(len(values))


def assess_uncertainty(probabilities: list[dict]) -> dict:
    """Return a conservative confidence level for the 10-class output.

    This is a deterministic runtime signal, not a clinical probability. The
    thresholds are deliberately conservative so ambiguous cases are flagged for
    human review.
    """
    values = sorted(
        [
            max(0.0, float(item.get("prob") or 0))
            for item in probabilities
            if isinstance(item, dict)
        ],
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
    entropy = _normalized_entropy(values)
    if top >= 60 and margin >= 15 and entropy <= 0.62:
        level, label, reason = "high", "高置信", "最高类别概率较高且与第二名有区分度。"
    elif top < 25 or margin < 5 or entropy > 0.82:
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
    }
