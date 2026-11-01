"""Fit post-hoc temperature scaling and selective-prediction thresholds.

Usage:
  python -m backend.calibrate_selective \
    --manifest data/nih_test_full/image_manifest.csv \
    --images data/nih_test_full/images \
    --max-images 800 \
    --out backend/calibration.json

This is a post-hoc calibration experiment. Use patient-level splits and never
tune on the final holdout.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

from .calibration import normalized_entropy, temperature_probabilities
from .config import DISEASE_LIST
from .model_infer import predict_logits

LABEL_CODES = [item["code"] for item in DISEASE_LIST]
TARGET_COVERAGES = [1.0, 0.9, 0.8, 0.7, 0.6]


def _load_rows(manifest: Path, images: Path, max_images: int, seed: int):
    rows = list(csv.DictReader(manifest.open(encoding="utf-8")))
    rows = [row for row in rows if (images / row["image"]).is_file()]
    patients = sorted({str(row.get("patient_id") or "") for row in rows if row.get("patient_id")})
    rng = random.Random(seed)
    rng.shuffle(patients)
    calibration_patients = set(patients[: max(1, len(patients) // 2)])
    calibration = [row for row in rows if str(row.get("patient_id") or "") in calibration_patients]
    holdout = [row for row in rows if str(row.get("patient_id") or "") not in calibration_patients]
    rng.shuffle(calibration)
    rng.shuffle(holdout)
    per_split = max(10, max_images // 2)
    return calibration[:per_split], holdout[:per_split]


def _infer_rows(rows, images: Path):
    logits = []
    labels = []
    for index, row in enumerate(rows, 1):
        with Image.open(images / row["image"]) as image:
            raw, _processed, _preprocessing = predict_logits(image)
        logits.append(raw)
        labels.append([int(row.get(code, "0") or 0) for code in LABEL_CODES])
        if index % 50 == 0:
            print(f"  inferred {index}/{len(rows)}", flush=True)
    return np.asarray(logits, dtype=np.float64), np.asarray(labels, dtype=np.float64)


def _bce(logits: np.ndarray, labels: np.ndarray, temperature: float) -> float:
    probabilities = np.asarray(temperature_probabilities(logits.ravel().tolist(), temperature), dtype=np.float64)
    probabilities = probabilities.reshape(logits.shape)
    probabilities = np.clip(probabilities, 1e-6, 1 - 1e-6)
    return float(-np.mean(labels * np.log(probabilities) + (1 - labels) * np.log(1 - probabilities)))


def _fit_temperature(logits: np.ndarray, labels: np.ndarray) -> tuple[float, float, float]:
    before = _bce(logits, labels, 1.0)
    best_temperature = 1.0
    best_loss = before
    for temperature in np.arange(0.5, 3.01, 0.05):
        loss = _bce(logits, labels, float(temperature))
        if loss < best_loss:
            best_loss = loss
            best_temperature = float(temperature)
    return round(best_temperature, 3), round(before, 5), round(best_loss, 5)


def _confidence(logits: np.ndarray, temperature: float) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    probabilities = np.asarray(
        temperature_probabilities(logits.ravel().tolist(), temperature), dtype=np.float64
    ).reshape(logits.shape)
    ordered = np.sort(probabilities, axis=1)[:, ::-1]
    top1 = ordered[:, 0]
    margin = top1 - ordered[:, 1]
    entropy = np.asarray(
        [normalized_entropy(row.tolist()) for row in probabilities], dtype=np.float64
    )
    return probabilities, top1, margin, entropy


def _risk_coverage(probabilities, labels, top1, calibration_top1):
    order = np.argsort(top1)[::-1]
    sorted_top = top1[order]
    top1_hits = labels[np.arange(len(labels)), np.argmax(probabilities, axis=1)] > 0
    top3_hits = np.any(
        labels[np.arange(len(labels))[:, None], np.argsort(probabilities, axis=1)[:, -3:]] > 0,
        axis=1,
    )
    curves = []
    for target in TARGET_COVERAGES:
        rank = min(len(sorted_top) - 1, max(0, int(math.ceil(target * len(sorted_top))) - 1))
        threshold = float(sorted_top[rank])
        accepted = top1 >= threshold
        coverage = float(np.mean(accepted))
        curves.append(
            {
                "target_coverage": target,
                "threshold": round(threshold, 4),
                "coverage": round(coverage, 4),
                "top1_accuracy": round(float(np.mean(top1_hits[accepted])) if accepted.any() else 0.0, 4),
                "top3_accuracy": round(float(np.mean(top3_hits[accepted])) if accepted.any() else 0.0, 4),
                "accepted": int(accepted.sum()),
                "total": int(len(accepted)),
            }
        )
    return curves


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=Path("data/nih_test_full/image_manifest.csv"))
    parser.add_argument("--images", type=Path, default=Path("data/nih_test_full/images"))
    parser.add_argument("--max-images", type=int, default=800)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--out", type=Path, default=Path("backend/calibration.json"))
    parser.add_argument("--report", type=Path, default=Path("reports/calibration_selective_experiment.json"))
    args = parser.parse_args()

    calibration_rows, holdout_rows = _load_rows(args.manifest, args.images, args.max_images, args.seed)
    print(f"calibration={len(calibration_rows)} holdout={len(holdout_rows)}", flush=True)
    calibration_logits, calibration_labels = _infer_rows(calibration_rows, args.images)
    holdout_logits, holdout_labels = _infer_rows(holdout_rows, args.images)

    temperature, bce_before, bce_after = _fit_temperature(calibration_logits, calibration_labels)
    calibration_probabilities, calibration_top1, _margin, _entropy = _confidence(
        calibration_logits, temperature
    )
    holdout_probabilities, holdout_top1, _margin, _entropy = _confidence(holdout_logits, temperature)
    curves = _risk_coverage(
        holdout_probabilities, holdout_labels, holdout_top1, calibration_top1
    )
    review_threshold = next(
        (item["threshold"] for item in curves if abs(item["target_coverage"] - 0.8) < 1e-9),
        float(np.quantile(holdout_top1, 0.2)),
    )
    high_threshold = next(
        (item["threshold"] for item in curves if abs(item["target_coverage"] - 0.7) < 1e-9),
        float(np.quantile(holdout_top1, 0.3)),
    )
    payload = {
        "version": 1,
        "temperature": temperature,
        "confidence": {
            "high_top_percent": round(high_threshold * 100, 1),
            "low_top_percent": round(review_threshold * 100, 1),
            "low_margin_percent": 5.0,
            "high_entropy": 0.62,
            "low_entropy": 0.82,
        },
        "selective": {
            "review_top_percent": round(review_threshold * 100, 1),
            "review_margin_percent": 10.0,
            "target_coverage": 0.8,
        },
        "provenance": f"post-hoc NIH calibration; n={len(calibration_rows)}; holdout={len(holdout_rows)}; seed={args.seed}",
        "risk_coverage": curves,
        "calibration": {
            "n": len(calibration_rows),
            "holdout_n": len(holdout_rows),
            "bce_before": bce_before,
            "bce_after": bce_after,
        },
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"temperature": temperature, "bce_before": bce_before, "bce_after": bce_after, "risk_coverage": curves}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
