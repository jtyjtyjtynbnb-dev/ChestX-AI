"""Small, reproducible robustness evaluation for the bundled demo images.

This is NOT a clinical validation set. It is a contest-oriented smoke test:
- top-1 / top-3 consistency against the intended teaching label;
- prediction consistency under brightness and small-rotation perturbations;
- image-guard metrics for the same images.

Usage:
    python -m backend.evaluate
    python -m backend.evaluate --json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageEnhance

from .image_quality import inspect_chest_xray
from .model_infer import diagnose_image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "frontend" / "assets"
CASES_PATH = Path(__file__).resolve().parent / "eval" / "cases.json"


def _codes(result: dict) -> list[str]:
    return [str(item.get("code")) for item in result.get("all_predictions", [])]


def _variant(image: Image.Image, kind: str) -> Image.Image:
    if kind == "brightness_0.7":
        return ImageEnhance.Brightness(image).enhance(0.7)
    if kind == "brightness_1.3":
        return ImageEnhance.Brightness(image).enhance(1.3)
    if kind == "rotate_-8":
        return image.rotate(-8, resample=Image.Resampling.BICUBIC, expand=False)
    if kind == "rotate_+8":
        return image.rotate(8, resample=Image.Resampling.BICUBIC, expand=False)
    return image


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="print machine-readable JSON only")
    args = parser.parse_args()

    cases = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    rows = []
    top1_hits = 0
    top3_hits = 0
    variant_total = 0
    variant_stable = 0
    variant_expected_hits = 0
    for case in cases:
        image_path = ASSET_ROOT / case["image"]
        image = Image.open(image_path)
        guard_ok, guard_message, guard_metrics = inspect_chest_xray(image)
        result = diagnose_image(image)
        codes = _codes(result)
        expected = case["expected"]
        acceptable = set(case.get("acceptable") or [expected])
        top1 = bool(codes and codes[0] in acceptable)
        top3 = any(code in acceptable for code in codes[:3])
        top1_hits += int(top1)
        top3_hits += int(top3)
        variant_hits = 0
        variants = ["brightness_0.7", "brightness_1.3", "rotate_-8", "rotate_+8"]
        for variant in variants:
            variant_result = diagnose_image(_variant(image, variant))
            variant_total += 1
            variant_codes = _codes(variant_result)
            if variant_codes[:1] == codes[:1]:
                variant_stable += 1
            if variant_codes and variant_codes[0] in acceptable:
                variant_hits += 1
                variant_expected_hits += 1
        rows.append({
            "image": case["image"],
            "label": case["label"],
            "expected": expected,
            "guard_ok": guard_ok,
            "guard_message": guard_message,
            "guard_metrics": guard_metrics,
            "top1": codes[0] if codes else None,
            "top3": codes[:3],
            "top1_hit": top1,
            "top3_hit": top3,
            "variant_top1_hits": variant_hits,
            "variant_total": len(variants),
        })

    summary = {
        "cases": len(rows),
        "top1_accuracy": round(top1_hits / max(len(rows), 1), 4),
        "top3_accuracy": round(top3_hits / max(len(rows), 1), 4),
        "variant_stability": round(variant_stable / max(variant_total, 1), 4),
        "variant_expected_accuracy": round(variant_expected_hits / max(variant_total, 1), 4),
        "note": "Small bundled-image smoke test with clinically acceptable finding sets; not a clinical validation set.",
        "rows": rows,
    }
    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(f"cases={summary['cases']} top1={summary['top1_accuracy']:.1%} "
              f"top3={summary['top3_accuracy']:.1%} variant_stability={summary['variant_stability']:.1%} "
              f"variant_expected={summary['variant_expected_accuracy']:.1%}")
        print("image | expected | top1 | top3 | guard | variants")
        for row in rows:
            print(f"{row['image']} | {row['expected']} | {row['top1']} | {','.join(row['top3'])} | "
                  f"{row['guard_ok']} | {row['variant_top1_hits']}/{row['variant_total']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
