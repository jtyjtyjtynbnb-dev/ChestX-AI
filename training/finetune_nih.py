"""Fine-tune the shipped DenseNet-121 10-class model on NIH train_val.

The script only reads the manifests produced by
training.prepare_finetune_data. It saves a candidate checkpoint and an ONNX
candidate; it never overwrites backend/model.onnx automatically.

Example:
  python -m training.finetune_nih \
    --train data/finetune/train.csv \
    --val data/finetune/val.csv \
    --checkpoint C:/Users/Acer/Desktop/densenet121_chestx14_10cls.pth \
    --out training/runs/finetune_nih \
    --epochs 2 --batch-size 24 --workers 0
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from torchvision.transforms import InterpolationMode

CLASS_CODES = [
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
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


class ChestXrayNet(nn.Module):
    """Training wrapper matching the shipped checkpoint key names."""

    def __init__(self) -> None:
        super().__init__()
        self.backbone = models.densenet121(weights=None)
        self.backbone.classifier = nn.Linear(1024, len(CLASS_CODES))

    def forward(self, images: torch.Tensor, return_cam: bool = False):
        features = F.relu(self.backbone.features(images))
        pooled = F.adaptive_avg_pool2d(features, (1, 1))
        logits = self.backbone.classifier(torch.flatten(pooled, 1))
        if not return_cam:
            return logits
        weights = self.backbone.classifier.weight[torch.argmax(logits, dim=1)]
        cam = F.relu((features * weights[:, :, None, None]).sum(dim=1))
        return logits, cam


class ChestDataset(Dataset):
    def __init__(self, csv_path: Path, train: bool):
        self.rows = []
        with csv_path.open(encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                if Path(row["image_path"]).is_file():
                    self.rows.append(row)
        self.train = train
        if train:
            self.transform = transforms.Compose([
                transforms.RandomResizedCrop(224, scale=(0.88, 1.0), ratio=(0.92, 1.08), interpolation=InterpolationMode.BILINEAR),
                transforms.RandomRotation(7, interpolation=InterpolationMode.BILINEAR),
                transforms.ColorJitter(brightness=0.08, contrast=0.08),
                transforms.ToTensor(),
                transforms.Normalize(MEAN, STD),
            ])
        else:
            self.transform = transforms.Compose([
                transforms.Resize(256, interpolation=InterpolationMode.BILINEAR),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(MEAN, STD),
            ])

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, index: int):
        row = self.rows[index]
        with Image.open(row["image_path"]) as image:
            image = image.convert("RGB")
            tensor = self.transform(image)
        labels = torch.tensor([float(row[code] or 0) for code in CLASS_CODES], dtype=torch.float32)
        return tensor, labels


def _auc(scores: np.ndarray, labels: np.ndarray) -> float:
    positive = labels > 0
    negative = ~positive
    if not positive.any() or not negative.any():
        return float("nan")
    order = np.argsort(scores)
    ranks = np.empty(len(scores), dtype=np.float64)
    ranks[order] = np.arange(1, len(scores) + 1)
    positives = ranks[positive].sum()
    return float((positives - positive.sum() * (positive.sum() + 1) / 2) / (positive.sum() * negative.sum()))


def evaluate(model, loader, device) -> dict:
    model.eval()
    probabilities = []
    labels = []
    with torch.no_grad():
        for images, targets in loader:
            images = images.to(device, non_blocking=True)
            with torch.autocast(device_type="cuda", enabled=device.type == "cuda"):
                logits = model(images)
            probabilities.append(torch.sigmoid(logits.float()).cpu().numpy())
            labels.append(targets.numpy())
    probability = np.concatenate(probabilities, axis=0)
    target = np.concatenate(labels, axis=0)
    order = np.argsort(probability, axis=1)
    top1 = np.argmax(probability, axis=1)
    top3 = order[:, -3:][:, ::-1]
    per_class = {
        code: round(_auc(probability[:, index], target[:, index]), 5)
        for index, code in enumerate(CLASS_CODES)
    }
    top1_hit = target[np.arange(len(top1)), top1] > 0
    top3_hit = np.any(target[np.arange(len(top3))[:, None], top3] > 0, axis=1)
    exact = np.all((probability >= 0.5) == (target > 0), axis=1)
    return {
        "images": int(len(target)),
        "top1": round(float(top1_hit.mean()), 4),
        "top3": round(float(top3_hit.mean()), 4),
        "exact_match": round(float(exact.mean()), 4),
        "mean_auc": round(float(np.nanmean(list(per_class.values()))), 5),
        "per_class_auc": per_class,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=Path, default=Path("data/finetune/train.csv"))
    parser.add_argument("--val", type=Path, default=Path("data/finetune/val.csv"))
    parser.add_argument("--checkpoint", type=Path, default=Path(r"C:/Users/Acer/Desktop/densenet121_chestx14_10cls.pth"))
    parser.add_argument("--out", type=Path, default=Path("training/runs/finetune_nih"))
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--batch-size", type=int, default=24)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"device={device} train={args.train} val={args.val}", flush=True)

    train_dataset = ChestDataset(args.train, train=True)
    val_dataset = ChestDataset(args.val, train=False)
    print(f"train_images={len(train_dataset)} val_images={len(val_dataset)}", flush=True)
    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=args.workers, pin_memory=True, drop_last=False)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.workers, pin_memory=True)

    model = ChestXrayNet().to(device)
    checkpoint = torch.load(args.checkpoint, map_location="cpu", weights_only=False)
    missing, unexpected = model.load_state_dict(checkpoint["model_state_dict"], strict=False)
    print(f"checkpoint_missing={len(missing)} unexpected={len(unexpected)}", flush=True)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)
    criterion = nn.BCEWithLogitsLoss()
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    args.out.mkdir(parents=True, exist_ok=True)
    best_auc = -1.0
    history = []

    for epoch in range(1, args.epochs + 1):
        model.train()
        started = time.time()
        running = 0.0
        batches = 0
        for images, targets in train_loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type="cuda", enabled=device.type == "cuda"):
                logits = model(images)
                loss = criterion(logits, targets)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            scaler.step(optimizer)
            scaler.update()
            running += float(loss.detach().cpu())
            batches += 1
            if batches % 100 == 0:
                print(f"epoch={epoch} batch={batches}/{len(train_loader)} loss={running / batches:.4f} elapsed={time.time() - started:.0f}s", flush=True)
        metrics = evaluate(model, val_loader, device)
        record = {"epoch": epoch, "train_loss": round(running / max(batches, 1), 5), "val": metrics}
        history.append(record)
        (args.out / "val_metrics.json").write_text(json.dumps({"history": history, "best": metrics}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        torch.save({
            "model_state_dict": model.state_dict(),
            "class_names": [code.replace("_", " ").title() for code in CLASS_CODES],
            "class_codes": CLASS_CODES,
            "num_classes": len(CLASS_CODES),
            "target_layer": "features.denseblock4.dnspool",
            "val": metrics,
            "epoch": epoch,
        }, args.out / "last.pt")
        if metrics["mean_auc"] > best_auc:
            best_auc = metrics["mean_auc"]
            torch.save({
                "model_state_dict": model.state_dict(),
                "class_names": [code.replace("_", " ").title() for code in CLASS_CODES],
                "class_codes": CLASS_CODES,
                "num_classes": len(CLASS_CODES),
                "target_layer": "features.denseblock4.dnspool",
                "val": metrics,
                "epoch": epoch,
            }, args.out / "best.pt")
            # Candidate ONNX is generated separately by export_onnx_candidate.py.
        print(json.dumps(record, ensure_ascii=False), flush=True)

    print(json.dumps({"best_auc": best_auc, "out": str(args.out)}, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
