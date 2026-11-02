"""Fit temperature scaling and selective thresholds on the held-out val split.

Uses the full-data fine-tuned checkpoint and data/finetune_full/val.csv; never
touches the official test set.
"""

from __future__ import annotations

import argparse
import csv
import json
import random
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from backend.calibration import normalized_entropy, temperature_probabilities
from training.finetune_nih import CLASS_CODES, ChestXrayNet

MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


class ValDataset(Dataset):
    def __init__(self, rows):
        self.rows = rows
        self.transform = transforms.Compose([
            transforms.Resize(256, interpolation=InterpolationMode.BILINEAR),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        row = self.rows[index]
        with Image.open(row["image_path"]) as image:
            tensor = self.transform(image.convert("RGB"))
        labels = torch.tensor([float(row.get(code) or 0) for code in CLASS_CODES], dtype=torch.float32)
        return tensor, labels


def _bce(logits: np.ndarray, labels: np.ndarray, temperature: float) -> float:
    flat = temperature_probabilities(logits.ravel().tolist(), temperature)
    probability = np.asarray(flat, dtype=np.float64).reshape(logits.shape)
    probability = np.clip(probability, 1e-6, 1 - 1e-6)
    return float(-np.mean(labels * np.log(probability) + (1 - labels) * np.log(1 - probability)))


def _fit_temperature(logits, labels):
    best_temperature, best_loss = 1.0, _bce(logits, labels, 1.0)
    for temperature in np.arange(0.5, 3.01, 0.05):
        loss = _bce(logits, labels, float(temperature))
        if loss < best_loss:
            best_temperature, best_loss = float(temperature), loss
    return round(best_temperature, 3), round(best_loss, 5)


def _confidence(logits, temperature):
    probability = np.asarray(temperature_probabilities(logits.ravel().tolist(), temperature), dtype=np.float64).reshape(logits.shape)
    ordered = np.sort(probability, axis=1)[:, ::-1]
    top1 = ordered[:, 0]
    margin = top1 - ordered[:, 1]
    entropy = np.asarray([normalized_entropy(row.tolist()) for row in probability], dtype=np.float64)
    return probability, top1, margin, entropy


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--val", type=Path, default=Path("data/finetune_full/val.csv"))
    parser.add_argument("--checkpoint", type=Path, default=Path("training/runs/finetune_nih_full/best.pt"))
    parser.add_argument("--out", type=Path, default=Path("backend/calibration.json"))
    parser.add_argument("--report", type=Path, default=Path("reports/calibration.json"))
    parser.add_argument("--max-images", type=int, default=8000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    rows = [row for row in csv.DictReader(args.val.open(encoding="utf-8")) if Path(row["image_path"]).is_file()]
    rng = random.Random(args.seed)
    by_patient: dict[str, list[dict]] = {}
    for row in rows:
        by_patient.setdefault(str(row.get("patient_id") or ""), []).append(row)
    patients = list(by_patient)
    rng.shuffle(patients)
    calibration_rows = [row for patient in patients[: max(1, len(patients) // 2)] for row in by_patient[patient]]
    holdout_rows = [row for patient in patients[max(1, len(patients) // 2):] for row in by_patient[patient]]
    cap = max(2, args.max_images // 2)
    calibration_rows, holdout_rows = calibration_rows[:cap], holdout_rows[:cap]

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ChestXrayNet()
    model.load_state_dict(torch.load(args.checkpoint, map_location="cpu", weights_only=False)["model_state_dict"], strict=True)
    model.to(device).eval()
    print(f"device={device} calibration={len(calibration_rows)} holdout={len(holdout_rows)}", flush=True)

    def collect(split_rows):
        loader = DataLoader(ValDataset(split_rows), batch_size=64, shuffle=False, num_workers=0)
        logits, labels = [], []
        with torch.no_grad():
            for images, targets in loader:
                with torch.autocast(device_type="cuda", enabled=device.type == "cuda"):
                    output = model(images.to(device))
                logits.append(output.float().cpu().numpy())
                labels.append(targets.numpy())
        return np.concatenate(logits), np.concatenate(labels)

    calibration_logits, calibration_labels = collect(calibration_rows)
    holdout_logits, holdout_labels = collect(holdout_rows)
    temperature, bce_after = _fit_temperature(calibration_logits, calibration_labels)
    calibration_probability, calibration_top1, calibration_margin, calibration_entropy = _confidence(calibration_logits, temperature)
    holdout_probability, holdout_top1, holdout_margin, holdout_entropy = _confidence(holdout_logits, temperature)
    top1_hit = holdout_labels[np.arange(len(holdout_top1)), np.argmax(holdout_probability, axis=1)] > 0
    top3_indices = np.argsort(holdout_probability, axis=1)[:, -3:]
    top3_hit = np.any(holdout_labels[np.arange(len(top3_indices))[:, None], top3_indices] > 0, axis=1)
    curves = []
    for target in [1.0, 0.9, 0.8, 0.7, 0.6]:
        order = np.argsort(holdout_top1)[::-1]
        index = min(len(order) - 1, max(0, int(np.ceil(target * len(order))) - 1))
        threshold = float(holdout_top1[order[index]])
        accepted = holdout_top1 >= threshold
        curves.append({
            "target_coverage": target,
            "threshold": round(threshold, 4),
            "coverage": round(float(accepted.mean()), 4),
            "top1_accuracy": round(float(top1_hit[accepted].mean()), 4) if accepted.any() else 0.0,
            "top3_accuracy": round(float(top3_hit[accepted].mean()), 4) if accepted.any() else 0.0,
        })
    high = float(np.quantile(calibration_top1, 0.30))
    low = float(np.quantile(calibration_top1, 0.05))
    margin_low = float(np.quantile(calibration_margin, 0.10))
    high_entropy = float(np.quantile(calibration_entropy, 0.70))
    low_entropy = float(np.quantile(calibration_entropy, 0.95))
    config = {
        "version": 1,
        "temperature": temperature,
        "confidence": {
            "high_top_percent": round(high * 100, 1),
            "low_top_percent": round(low * 100, 1),
            "low_margin_percent": round(margin_low * 100, 1),
            "high_entropy": round(high_entropy, 4),
            "low_entropy": round(low_entropy, 4),
        },
        "selective": {
            "review_top_percent": round(low * 100, 1),
            "review_margin_percent": round(margin_low * 100, 1),
            "target_coverage": 0.8,
        },
        "provenance": f"val patient split; calibration={len(calibration_rows)} holdout={len(holdout_rows)}; seed={args.seed}",
        "risk_coverage": curves,
        "calibration": {"bce_after": bce_after},
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(config, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
