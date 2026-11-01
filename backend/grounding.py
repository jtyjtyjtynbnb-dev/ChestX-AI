"""Deterministic groundedness checks for evidence-based reports.

This is not a factual truth oracle. It measures whether generated claims have
lexical support in the retrieved source chunks and flags claims that do not.
"""

from __future__ import annotations

import re

from .safety import has_unsafe_clinical_language


def _terms(value: str) -> set[str]:
    text = str(value or "").lower()
    terms = set(re.findall(r"[a-z0-9]+", text))
    chinese = "".join(re.findall(r"[\u4e00-\u9fff]", text))
    terms.update(chinese[index : index + 2] for index in range(max(0, len(chinese) - 1)))
    return {term for term in terms if term}


def evaluate_grounding(report: dict, documents: list[dict]) -> dict:
    """Return {score, status, supported, total, unsupported_claims}."""
    by_id = {str(item.get("id") or ""): item for item in documents}
    claims = report.get("evidence") if isinstance(report.get("evidence"), list) else []
    supported = 0
    total = 0
    unsupported: list[dict] = []
    scores: list[float] = []
    for item in claims:
        if not isinstance(item, dict):
            continue
        chunk_id = str(item.get("chunk_id") or "")
        claim = str(item.get("claim") or "").strip()
        document = by_id.get(chunk_id)
        if not claim or document is None:
            continue
        total += 1
        claim_terms = _terms(claim)
        source_terms = _terms(f"{document.get('title', '')} {document.get('content', '')} { ' '.join(document.get('keywords', [])) }")
        overlap = len(claim_terms & source_terms)
        score = overlap / max(len(claim_terms), 1)
        scores.append(min(score, 1.0))
        if score >= 0.12:
            supported += 1
        else:
            unsupported.append({"chunk_id": chunk_id, "claim": claim[:120]})
    if total == 0:
        status = "no_evidence"
        score = 0.0
    else:
        score = sum(scores) / total
        if score >= 0.35:
            status = "strong"
        elif score >= 0.15:
            status = "partial"
        else:
            status = "weak"
    return {
        "score": round(float(score), 3),
        "status": status,
        "supported": supported,
        "total": total,
        "unsupported_claims": unsupported[:5],
        "unsafe": False,
    }
