"""Clinical-language safety layer shared by reports and chat answers.

The product is an education/demo tool. Model or Qwen output must never read as
a confirmed diagnosis, and must always point users to a clinician for further
evaluation.
"""

from __future__ import annotations

from typing import Any


# Ordered replacements: longer clinical phrases first.
REPLACEMENTS: tuple[tuple[str, str], ...] = (
    ("确诊为", "影像提示可能为"),
    ("可以确诊", "影像提示需结合临床进一步判断"),
    ("确诊", "影像提示"),
    ("患有", "影像提示可能存在"),
    ("诊断为", "影像提示考虑"),
    ("可以排除", "尚需结合临床进一步排除"),
    ("排除疾病", "尚需结合临床"),
    ("百分之百", "较高可能性"),
    ("一定是", "可能为"),
    ("立即服药", "请遵医嘱用药"),
    ("自行用药", "请咨询医生后用药"),
)

UNSAFE_TERMS = (
    "确诊",
    "患有",
    "诊断为",
    "可以排除",
    "百分之百",
    "一定是",
    "立即服药",
    "自行用药",
)

SAFE_SUFFIX = "以上仅为健康科普提示，不能替代医生面诊；建议携带影像到正规医疗机构进一步检查。"


def sanitize_text(value: str) -> str:
    """Rewrite absolute clinical claims into probabilistic education wording."""
    text = str(value or "")
    for source, target in REPLACEMENTS:
        text = text.replace(source, target)
    return text


def sanitize_report(value: Any) -> Any:
    """Recursively sanitize strings in a JSON-like report/chat payload."""
    if isinstance(value, str):
        return sanitize_text(value)
    if isinstance(value, list):
        return [sanitize_report(item) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_report(item) for key, item in value.items()}
    return value


def has_unsafe_clinical_language(value: Any) -> bool:
    """Return True when any string still contains an absolute diagnostic claim."""
    if isinstance(value, str):
        return any(term in value for term in UNSAFE_TERMS)
    if isinstance(value, list):
        return any(has_unsafe_clinical_language(item) for item in value)
    if isinstance(value, dict):
        return any(has_unsafe_clinical_language(item) for item in value.values())
    return False
