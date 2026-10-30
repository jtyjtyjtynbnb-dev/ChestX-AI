"""Train a lightweight chest-X-ray vs non-chest guard classifier.

This is a training-only utility. Runtime inference uses the exported ONNX via
backend/guard_classifier.py.
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
from sklearn.metrics import roc_auc_score
from torch import nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


LABELS = {"chest_xray": 0, "non_chest": 1}
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]


def build_transform(train: bool):
    if train:
        return transforms.Compose([
            transforms.RandomResizedCrop(224, scale=(0.7, 1.0)),
            transforms.RandomRotation(8),
            transforms.ColorJitter(brightness=0.25, contrast=0.25, saturation=0.15),
            transforms.RandomGrayscale(p=0.15),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])
    return transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(MEAN, STD),
    ])


class GuardDataset(Dataset):
    def __init__(self, roots: list[Path], transform):
        self.items: list[tuple[Path, int, str]] = []
        for root, label in roots:
            for path in sorted((root / "images").glob("*")):
                if path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp", ".gif"}:
                    self.items.append((path, label, root.name))
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, index):
        path, label, group = self.items[index]
        image = Image.open(path).convert("RGB")
        return self.transform(image), torch.tensor(label, dtype=torch.float32), str(path), group


def run_epoch(model, loader, criterion, optimizer, device, train):
    model.train(train)
    losses, labels, probs, paths = [], [], [], []
    for images, targets, batch_paths, _groups in loader:
        images = images.to(device, non_blocking=True)
        targets = targets.to(device, non_blocking=True)
        if train:
            optimizer.zero_grad(set_to_none=True)
        with torch.set_grad_enabled(train), torch.amp.autocast("cuda", enabled=device.type == "cuda"):
            logits = model(images).squeeze(1)
            loss = criterion(logits, targets)
        if train:
            loss.backward()
            optimizer.step()
        losses.append(float(loss.detach().cpu()))
        labels.extend(targets.detach().cpu().tolist())
        probs.extend(torch.sigmoid(logits.detach()).cpu().tolist())
        paths.extend(batch_paths)
    return float(np.mean(losses)), np.asarray(labels), np.asarray(probs), paths


def find_threshold(labels, probs):
    """Choose the lowest threshold that keeps CXR recall >= 0.99."""
    candidates = np.unique(np.concatenate([probs, [0.0, 1.0]]))
    best = None
    for threshold in candidates:
        # non_chest is positive (1); accept CXR when probability < threshold.
        cxr_recall = float((probs[labels == 0] < threshold).mean())
        specificity = float((probs[labels == 1] >= threshold).mean())
        if cxr_recall >= 0.99:
            if best is None or specificity > best[1]:
                best = (float(threshold), specificity, cxr_recall)
    if best is None:
        # Fall back to the threshold maximizing balanced accuracy.
        for threshold in candidates:
            cxr_recall = float((probs[labels == 0] < threshold).mean())
            specificity = float((probs[labels == 1] >= threshold).mean())
            score = 0.5 * (cxr_recall + specificity)
            if best is None or score > 0.5 * (best[2] + best[1]):
                best = (float(threshold), specificity, cxr_recall)
    return best


def metrics_at(labels, probs, threshold):
    predicted_non = probs >= threshold
    true_cxr = labels == 0
    true_non = labels == 1
    return {
        "cxr_recall": round(float((~predicted_non[true_cxr]).mean()), 4),
        "cxr_false_reject": round(float(predicted_non[true_cxr].mean()), 4),
        "non_chest_specificity": round(float(predicted_non[true_non].mean()), 4),
        "non_chest_rejection": round(float(predicted_non[true_non].mean()), 4),
        "auroc": round(float(roc_auc_score(labels, probs)), 4),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=Path("data/guard"))
    parser.add_argument("--out", type=Path, default=Path(".tmp-guard/run"))
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    args.out.mkdir(parents=True, exist_ok=True)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print("device", device, flush=True)

    train_ds = GuardDataset(
        [(args.data / "cxr_train", 0), (args.data / "non_chest_train", 1)],
        build_transform(True),
    )
    val_ds = GuardDataset(
        [(args.data / "cxr_val", 0), (args.data / "non_chest_val", 1)],
        build_transform(False),
    )
    test_ds = GuardDataset(
        [(args.data / "cxr_test", 0), (args.data / "non_chest_test", 1)],
        build_transform(False),
    )
    print("sizes", len(train_ds), len(val_ds), len(test_ds), flush=True)
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)
    test_loader = DataLoader(test_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 1)
    model.to(device)
    # Stage 1: train the head with the backbone frozen.
    for parameter in model.features.parameters():
        parameter.requires_grad = False
    n_cxr = sum(1 for _path, label, _group in train_ds.items if label == 0)
    n_non = sum(1 for _path, label, _group in train_ds.items if label == 1)
    pos_weight = max(n_cxr, 1) / max(n_non, 1)
    criterion = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([pos_weight], device=device))
    optimizer = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=args.lr)
    history = []
    best_auroc = -1.0
    best_state = None
    for epoch in range(1, args.epochs + 1):
        if epoch == 3:
            for parameter in model.features.parameters():
                parameter.requires_grad = True
            optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr / 4)
        train_loss, train_y, train_p, _ = run_epoch(model, train_loader, criterion, optimizer, device, True)
        val_loss, val_y, val_p, _ = run_epoch(model, val_loader, criterion, optimizer, device, False)
        auroc = float(roc_auc_score(val_y, val_p))
        threshold, specificity, recall = find_threshold(val_y, val_p)
        print(
            f"epoch {epoch}: train_loss={train_loss:.4f} val_loss={val_loss:.4f} "
            f"val_auroc={auroc:.4f} threshold={threshold:.3f} recall={recall:.4f} spec={specificity:.4f}",
            flush=True,
        )
        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "val_auroc": auroc,
            "threshold": threshold,
            "val_cxr_recall": recall,
            "val_non_chest_specificity": specificity,
        })
        if auroc > best_auroc:
            best_auroc = auroc
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
    if best_state is not None:
        model.load_state_dict(best_state)

    val_loss, val_y, val_p, _ = run_epoch(model, val_loader, criterion, optimizer, device, False)
    threshold, specificity, recall = find_threshold(val_y, val_p)
    # The learned threshold can collapse to ~0 on perfectly separated data. Use a
    # human-auditable high threshold when it still keeps >=99% CXR recall.
    selected = None
    for candidate in (0.10, 0.20, 0.30, 0.50, 0.80, 0.90):
        candidate_metrics = metrics_at(val_y, val_p, candidate)
        if candidate_metrics["cxr_recall"] >= 0.99:
            if selected is None or candidate_metrics["non_chest_specificity"] > selected[1]:
                selected = (candidate, candidate_metrics["non_chest_specificity"])
    if selected:
        threshold = selected[0]
    test_loss, test_y, test_p, test_paths = run_epoch(model, test_loader, criterion, optimizer, device, False)
    test_metrics = metrics_at(test_y, test_p, threshold)
    candidate_metrics = {
        str(candidate): metrics_at(test_y, test_p, candidate)
        for candidate in (0.10, 0.20, 0.30, 0.50, 0.80, 0.90, 0.95, 0.99)
    }
    # Category breakdown for non-chest test images.
    category_rows = []
    for split_name, root in [("val", args.data / "non_chest_val"), ("test", args.data / "non_chest_test")]:
        manifest = root / "manifest.csv"
        if not manifest.exists():
            continue
        with manifest.open(encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        by_name = {row["image"]: row for row in rows}
        for path_text, prob in zip(test_paths if split_name == "test" else [], test_p if split_name == "test" else []):
            name = Path(path_text).name
            row = by_name.get(name)
            if row:
                category_rows.append({
                    "split": split_name,
                    "image": name,
                    "category": row.get("category", ""),
                    "hard_negative": row.get("hard_negative", ""),
                    "p_non_chest": round(float(prob), 4),
                    "rejected": bool(prob >= threshold),
                })

    # Save the trained state before exporting, so an exporter failure is recoverable.
    torch.save({"model": model.state_dict(), "threshold": threshold}, args.out / "best.pt")
    # Export ONNX with a single non_chest logit on CPU for portability.
    model.eval()
    model.to("cpu")
    dummy = torch.randn(1, 3, 224, 224)
    onnx_path = args.out / "guard.onnx"
    torch.onnx.export(
        model,
        dummy,
        onnx_path,
        input_names=["input"],
        output_names=["non_chest_logit"],
        dynamic_axes={"input": {0: "batch"}, "non_chest_logit": {0: "batch"}},
        opset_version=17,
    )
    import onnxruntime as ort
    session = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
    probe = session.run(None, {"input": dummy.detach().cpu().numpy()})
    output_shape = list(probe[0].shape)

    result = {
        "train_size": len(train_ds),
        "val_size": len(val_ds),
        "test_size": len(test_ds),
        "best_val_auroc": round(best_auroc, 4),
        "threshold": round(threshold, 4),
        "val": metrics_at(val_y, val_p, threshold),
        "test": test_metrics,
        "test_threshold_candidates": candidate_metrics,
        "test_categories": category_rows,
        "onnx_output_shape": output_shape,
        "note": "Non-chest train has only portrait/landscape; val/test include document/other-modality hard negatives.",
    }
    (args.out / "guard_metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "history.json").write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.out / "threshold.json").write_text(json.dumps({
        "reject_threshold": round(threshold, 4),
        "warn_threshold": round(threshold * 0.7, 4),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("best_val_auroc", "threshold", "val", "test", "onnx_output_shape")}, ensure_ascii=False, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
