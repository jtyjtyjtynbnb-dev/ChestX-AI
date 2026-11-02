"""Evaluate the deployed ONNX model on the full NIH test manifest.

This runs the ONNX graph directly (no heatmap rendering) with the same
preprocessing used by backend/model_infer.py. It reports model-only metrics;
the guard is an independent pre-filter.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

from backend.image_quality import preprocess_image
from backend.model_infer import _preprocess, MODEL_PATH

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


def _top(truth: np.ndarray, probability: np.ndarray) -> dict:
    positive_rows = truth.sum(axis=1) > 0
    truth = truth[positive_rows]
    probability = probability[positive_rows]
    top1 = top3 = exact = 0
    for y, p in zip(truth, probability, strict=True):
        order = np.argsort(-p)
        gold = set(np.flatnonzero(y).tolist())
        top1 += order[0] in gold
        top3 += any(int(index) in gold for index in order[:3])
        exact += set(np.flatnonzero(p >= 0.5).tolist()) == gold
    return {
        "evaluated_images": int(len(truth)),
        "top1": round(top1 / max(len(truth), 1), 4),
        "top3": round(top3 / max(len(truth), 1), 4),
        "exact_match": round(exact / max(len(truth), 1), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("data/nih_test_full/selected_images.csv"))
    parser.add_argument("--images", type=Path, default=Path("data/nih_test_full/images"))
    parser.add_argument("--output", type=Path, default=Path("reports/finetune_onnx_full_eval.json"))
    parser.add_argument("--batch-size", type=int, default=24)
    args = parser.parse_args()

    rows = [row for row in csv.DictReader(args.manifest.open(encoding="utf-8")) if (args.images / row["image"]).is_file()]
    print(f"onnx={MODEL_PATH} rows={len(rows)}", flush=True)
    session = ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    truth: list[list[int]] = []
    probabilities: list[list[float]] = []
    with Image.open(args.images / rows[0]["image"]) as first:
        preprocess_image(first.convert("RGB"))
    for start in range(0, len(rows), args.batch_size):
        batch_rows = rows[start:start + args.batch_size]
        tensors = []
        for row in batch_rows:
            with Image.open(args.images / row["image"]) as image:
                processed, _ = preprocess_image(image.convert("RGB"))
                tensors.append(_preprocess(processed)[0])
        logits = session.run(["logits"], {input_name: np.stack(tensors)})[0]
        probabilities.extend((1.0 / (1.0 + np.exp(-logits))).tolist())
        truth.extend([[int(row[code] or 0) for code in CLASSES] for row in batch_rows])
        if start % (args.batch_size * 20) == 0:
            print(f"evaluated {min(start + len(batch_rows), len(rows))}/{len(rows)}", flush=True)

    y = np.asarray(truth, dtype=int)
    p = np.asarray(probabilities, dtype=float)
    per_class = {
        code: {
            "support": int(y[:, index].sum()),
            "auroc": round(_auroc(y[:, index], p[:, index]), 5) if _auroc(y[:, index], p[:, index]) is not None else None,
        }
        for index, code in enumerate(CLASSES)
    }
    result = {
        "model": str(MODEL_PATH),
        "rows": len(rows),
        "top": _top(y, p),
        "per_class": per_class,
        "note": "Deployed ONNX model-only; preprocessing matches backend; guard not applied.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
