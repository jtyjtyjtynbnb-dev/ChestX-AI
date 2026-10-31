"""Evaluate the shipped 10-class ONNX model on a labeled NIH test manifest.

The manifest must contain one row per image with the 10 target columns and an
`image` filename. Images are optional but required for actual metrics.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
from PIL import Image

from .guard_classifier import evaluate_guard
from .image_quality import inspect_chest_xray
from .model_infer import diagnose_image


CLASSES = [
    "no_finding",
    "atelectasis",
    "cardiomegaly",
    "effusion",
    "infiltration",
    "mass",
    "nodule",
    "pneumonia",
    "pneumothorax",
    "consolidation",
]


def _auroc(y: np.ndarray, p: np.ndarray) -> float | None:
    positive = y == 1
    n_pos = int(positive.sum())
    n_neg = int((~positive).sum())
    if n_pos == 0 or n_neg == 0:
        return None
    order = np.argsort(p, kind="mergesort")
    ranks = np.empty(len(p), dtype=float)
    sorted_p = p[order]
    i = 0
    while i < len(sorted_p):
        j = i + 1
        while j < len(sorted_p) and sorted_p[j] == sorted_p[i]:
            j += 1
        ranks[order[i:j]] = (i + 1 + j) / 2.0
        i = j
    return float((ranks[positive].sum() - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg))


def _average_precision(y: np.ndarray, p: np.ndarray) -> float | None:
    positive = y == 1
    n_pos = int(positive.sum())
    if n_pos == 0:
        return None
    order = np.argsort(-p, kind="mergesort")
    hits = positive[order]
    precision = np.cumsum(hits) / np.arange(1, len(hits) + 1)
    return float(precision[hits].sum() / n_pos)


def _top_metrics(truth: np.ndarray, prob: np.ndarray) -> dict:
    positive_rows = truth.sum(axis=1) > 0
    top1 = top3 = exact = 0
    n = int(positive_rows.sum())
    for y, p in zip(truth[positive_rows], prob[positive_rows], strict=True):
        order = np.argsort(-p)
        gold = set(np.flatnonzero(y).tolist())
        if order[0] in gold:
            top1 += 1
        if any(int(index) in gold for index in order[:3]):
            top3 += 1
        predicted = set(np.flatnonzero(p >= 0.5).tolist())
        if predicted == gold:
            exact += 1
    return {
        "evaluated_images": n,
        "top1": round(top1 / n, 4) if n else None,
        "top3": round(top3 / n, 4) if n else None,
        "exact_match": round(exact / n, 4) if n else None,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--labels", type=Path, required=True)
    parser.add_argument("--images", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("nih_eval_metrics.json"))
    parser.add_argument("--limit", type=int, default=0, help="0 means all rows")
    args = parser.parse_args()

    with args.labels.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if args.limit:
        rows = rows[: args.limit]

    truth: list[list[int]] = []
    probabilities: list[list[float]] = []
    used: list[str] = []
    missing: list[str] = []
    guard_rejected: list[str] = []
    failures: list[str] = []
    for row in rows:
        image_path = args.images / row["image"]
        if not image_path.is_file():
            missing.append(row["image"])
            continue
        try:
            image = Image.open(image_path)
            image.load()
        except Exception as exc:
            failures.append(f"{row['image']}: {exc}")
            continue
        guard = evaluate_guard(image)
        if guard.get("available"):
            if guard.get("decision") == "reject":
                guard_rejected.append(row["image"])
        else:
            plausible, _message, _metrics = inspect_chest_xray(image)
            if not plausible:
                guard_rejected.append(row["image"])
        try:
            result = diagnose_image(image)
        except Exception as exc:
            failures.append(f"{row['image']}: {exc}")
            continue
        by_code = {item["code"]: float(item["prob"]) / 100.0 for item in result["probabilities"]}
        truth.append([int(row[name]) for name in CLASSES])
        probabilities.append([by_code[name] for name in CLASSES])
        used.append(row["image"])

    y = np.asarray(truth, dtype=int)
    p = np.asarray(probabilities, dtype=float)
    per_class = {}
    for index, name in enumerate(CLASSES):
        column = p[:, index]
        pred = (column >= 0.5).astype(int)
        tp = int(((pred == 1) & (y[:, index] == 1)).sum())
        fp = int(((pred == 1) & (y[:, index] == 0)).sum())
        fn = int(((pred == 0) & (y[:, index] == 1)).sum())
        per_class[name] = {
            "support": int(y[:, index].sum()),
            "auroc": _auroc(y[:, index], column),
            "average_precision": _average_precision(y[:, index], column),
            "precision_at_0_5": round(tp / (tp + fp), 4) if tp + fp else None,
            "recall_at_0_5": round(tp / (tp + fn), 4) if tp + fn else None,
            "f1_at_0_5": round(2 * tp / (2 * tp + fp + fn), 4) if 2 * tp + fp + fn else None,
        }
    result = {
        "model": "backend/model.onnx",
        "labels": str(args.labels),
        "images": str(args.images),
        "requested_rows": len(rows),
        "evaluated_rows": len(used),
        "missing_images": len(missing),
        "guard_rejected": guard_rejected,
        "failures": failures,
        "top_metrics": _top_metrics(y, p) if len(used) else None,
        "per_class": per_class,
        "note": "NIH labels are report-NLP labels; this is a held-out test split, not clinical validation.",
    }
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "evaluated": len(used),
        "missing": len(missing),
        "failures": len(failures),
        "guard_rejected": len(guard_rejected),
        "top": result["top_metrics"],
    }, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
