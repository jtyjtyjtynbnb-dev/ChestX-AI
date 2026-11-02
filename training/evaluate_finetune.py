"""Evaluate the fine-tuned PyTorch checkpoint on the full NIH test manifest."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from backend.image_quality import preprocess_image
from training.finetune_nih import CLASS_CODES, ChestXrayNet

MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def _prepare(path: Path) -> torch.Tensor:
    with Image.open(path) as image:
        processed, _ = preprocess_image(image.convert("RGB"))
    array = np.asarray(processed.resize((224, 224), Image.Resampling.BILINEAR), dtype=np.float32) / 255.0
    array = (array - MEAN) / STD
    return torch.from_numpy(np.transpose(array, (2, 0, 1))).float()


def _auroc(y: np.ndarray, p: np.ndarray) -> float | None:
    positive = y == 1
    n_pos = int(positive.sum())
    n_neg = int((~positive).sum())
    if not n_pos or not n_neg:
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
    parser.add_argument("--checkpoint", type=Path, default=Path("training/runs/finetune_nih_25000/best.pt"))
    parser.add_argument("--manifest", type=Path, default=Path("data/nih_test_full/selected_images.csv"))
    parser.add_argument("--images", type=Path, default=Path("data/nih_test_full/images"))
    parser.add_argument("--output", type=Path, default=Path("reports/finetune_full_eval.json"))
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    model = ChestXrayNet()
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device).eval()
    rows = [row for row in csv.DictReader(args.manifest.open(encoding="utf-8")) if (args.images / row["image"]).is_file()]
    if args.limit:
        rows = rows[: args.limit]
    truth: list[list[int]] = []
    probabilities: list[list[float]] = []
    with torch.no_grad():
        for start in range(0, len(rows), args.batch_size):
            batch_rows = rows[start:start + args.batch_size]
            images = torch.stack([_prepare(args.images / row["image"]) for row in batch_rows]).to(device)
            with torch.autocast(device_type="cuda", enabled=device.type == "cuda"):
                logits = model(images)
            probabilities.extend(torch.sigmoid(logits.float()).cpu().tolist())
            truth.extend([[int(row[code] or 0) for code in CLASS_CODES] for row in batch_rows])
            if start % (args.batch_size * 10) == 0:
                print(f"evaluated {start + len(batch_rows)}/{len(rows)}", flush=True)
    y = np.asarray(truth, dtype=int)
    p = np.asarray(probabilities, dtype=float)
    per_class = {
        code: {
            "support": int(y[:, index].sum()),
            "auroc": round(_auroc(y[:, index], p[:, index]), 5) if _auroc(y[:, index], p[:, index]) is not None else None,
        }
        for index, code in enumerate(CLASS_CODES)
    }
    result = {"model": str(args.checkpoint), "rows": len(rows), "top": _top(y, p), "per_class": per_class, "note": "PyTorch candidate; model-only, no guard filtering"}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
