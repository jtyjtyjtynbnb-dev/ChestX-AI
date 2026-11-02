"""Build patient-level fine-tuning manifests from the official NIH lists.

Usage:
  python -m training.prepare_finetune_data \
    --data-dir C:/Users/Acer/Desktop/data \
    --out-dir data/finetune \
    --val-fraction 0.15
"""

from __future__ import annotations

import argparse
import csv
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path

LABELS = {
    "No Finding": "no_finding",
    "Atelectasis": "atelectasis",
    "Cardiomegaly": "cardiomegaly",
    "Effusion": "effusion",
    "Infiltration": "infiltration",
    "Mass": "mass",
    "Nodule": "nodule",
    "Pneumonia": "pneumonia",
    "Pneumothorax": "pneumothorax",
    "Consolidation": "consolidation",
}
FIELDNAMES = ["image_path", "patient_id", "view", *LABELS.values()]


def _read_set(path: Path) -> set[str]:
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def _image_index(data_dir: Path) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for folder in sorted(data_dir.glob("images_*")):
        for image in folder.rglob("*.png"):
            index[image.name] = image.resolve()
    return index


def _labels(raw: str) -> dict[str, int]:
    found = {item.strip() for item in raw.split("|") if item.strip()}
    mapped = {code: int(any(label in found for label in names)) for code, names in {
        "no_finding": {"No Finding"},
        "atelectasis": {"Atelectasis"},
        "cardiomegaly": {"Cardiomegaly"},
        "effusion": {"Effusion"},
        "infiltration": {"Infiltration"},
        "mass": {"Mass"},
        "nodule": {"Nodule"},
        "pneumonia": {"Pneumonia"},
        "pneumothorax": {"Pneumothorax"},
        "consolidation": {"Consolidation"},
    }.items()}
    # No Finding is mutually exclusive with the nine abnormal classes.
    if mapped["no_finding"]:
        for code in LABELS.values():
            if code != "no_finding":
                mapped[code] = 0
    return mapped


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, default=Path("data/finetune"))
    parser.add_argument("--val-fraction", type=float, default=0.15)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    data_dir = args.data_dir
    train_val_names = _read_set(data_dir / "train_val_list.txt")
    test_names = _read_set(data_dir / "test_list.txt")
    image_index = _image_index(data_dir)
    available_train_val = train_val_names & set(image_index)
    available_test = test_names & set(image_index)
    print(f"available train_val={len(available_train_val)} test={len(available_test)}", flush=True)

    rows = []
    with (data_dir / "Data_Entry_2017_v2020.csv").open(encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            name = row["Image Index"]
            if name not in available_train_val:
                continue
            mapped = _labels(row.get("Finding Labels") or "")
            rows.append({
                "image_path": str(image_index[name]),
                "patient_id": row.get("Patient ID") or "",
                "view": row.get("View Position") or "",
                **mapped,
            })

    by_patient: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_patient[str(row["patient_id"])].append(row)
    patients = sorted(by_patient)
    rng = random.Random(args.seed)
    rng.shuffle(patients)
    val_count = max(1, int(round(len(patients) * args.val_fraction)))
    val_patients = set(patients[:val_count])
    train_rows = [row for row in rows if str(row["patient_id"]) not in val_patients]
    val_rows = [row for row in rows if str(row["patient_id"]) in val_patients]

    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, split in (("train.csv", train_rows), ("val.csv", val_rows)):
        with (args.out_dir / name).open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
            writer.writeheader()
            writer.writerows(split)

    test_rows = []
    for name in sorted(available_test):
        test_rows.append({"image_path": str(image_index[name]), "patient_id": "", "view": "", **{code: 0 for code in LABELS.values()}})
    with (args.out_dir / "available_test_images.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(test_rows)

    summary = {
        "train": len(train_rows),
        "val": len(val_rows),
        "available_test": len(test_rows),
        "train_patients": len({row["patient_id"] for row in train_rows}),
        "val_patients": len({row["patient_id"] for row in val_rows}),
        "test_patient_leak": len({row["patient_id"] for row in train_rows} & {row["patient_id"] for row in val_rows}),
        "train_class_counts": {code: sum(row[code] for row in train_rows) for code in LABELS.values()},
        "val_class_counts": {code: sum(row[code] for row in val_rows) for code in LABELS.values()},
    }
    (args.out_dir / "dataset_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
