# ChestX-AI maintenance: 影像质量与格式边界：尺寸、曝光、压缩 DICOM、损坏文件的前置检查。
"""Chest X-ray plausibility checks and conservative display preprocessing.

The guard is intentionally conservative: it rejects clearly non-radiographic
inputs (colour photos, extreme aspect ratios, blank frames) without pretending
to be a trained organ classifier. Grayscale portraits can still pass; the
technical report documents that residual risk.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from PIL import Image, ImageOps


MIN_SIDE = 128
ASPECT_MIN = 0.45
ASPECT_MAX = 2.2
SATURATION_LIMIT = 0.18
CHANNEL_SPREAD_LIMIT = 12.0
MIN_STD = 4.0
MIN_EDGE_DENSITY = 0.004


@dataclass(frozen=True)
class ImageMetrics:
    width: int
    height: int
    aspect: float
    mean: float
    std: float
    saturation: float
    channel_spread: float
    edge_density: float


def _metrics(image: Image.Image) -> ImageMetrics:
    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    sample = image.resize((256, 256), Image.Resampling.BILINEAR)
    array = np.asarray(sample, dtype=np.float32)
    maximum = array.max(axis=2)
    minimum = array.min(axis=2)
    saturation = np.divide(
        maximum - minimum,
        np.maximum(maximum, 1.0),
        dtype=np.float32,
    )
    gray = 0.299 * array[:, :, 0] + 0.587 * array[:, :, 1] + 0.114 * array[:, :, 2]
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    edge_density = float(((gx > 20).mean() + (gy > 20).mean()) / 2)
    return ImageMetrics(
        width=width,
        height=height,
        aspect=width / max(height, 1),
        mean=float(gray.mean()),
        std=float(gray.std()),
        saturation=float(saturation.mean()),
        channel_spread=float((maximum - minimum).mean()),
        edge_density=edge_density,
    )


def inspect_chest_xray(image: Image.Image) -> tuple[bool, str, dict[str, Any]]:
    """胸片内容防御：返回（是否可信, 用户提示, 指标）。

    这是保守的工程启发式，不是训练出来的器官分类器；它优先拦截彩色照片、
    极端比例、空白/过曝图像，允许灰度胸片通过。灰度人像仍可能漏过，技术报告
    中明确记录该剩余风险。
    """
    metrics = _metrics(image)
    payload = {
        "width": metrics.width,
        "height": metrics.height,
        "aspect": round(metrics.aspect, 3),
        "mean": round(metrics.mean, 1),
        "std": round(metrics.std, 1),
        "saturation": round(metrics.saturation, 3),
        "edge_density": round(metrics.edge_density, 4),
    }
    if metrics.width < MIN_SIDE or metrics.height < MIN_SIDE:
        return False, "图片尺寸过小，请上传清晰的正位胸部X光片。", payload
    if not ASPECT_MIN <= metrics.aspect <= ASPECT_MAX:
        return False, "图片比例异常，请上传完整的正位胸部X光片，勿上传截屏或人像照片。", payload
    if metrics.saturation > SATURATION_LIMIT and metrics.channel_spread > CHANNEL_SPREAD_LIMIT:
        return False, "检测到彩色图像，未识别为胸片。请上传黑白胸部X光片，勿上传人像、风景或报告截图。", payload
    if metrics.std < MIN_STD or metrics.mean < 10 or metrics.mean > 248:
        return False, "图像过暗、过曝或近乎空白，无法进行胸片分析。", payload
    if metrics.edge_density < MIN_EDGE_DENSITY:
        return False, "未能识别到胸片结构，请上传清晰的胸部X光影像。", payload
    return True, "", payload


def _symmetry_score(gray: Image.Image, angle: float) -> float:
    rotated = gray.rotate(angle, resample=Image.Resampling.BILINEAR, fillcolor=0)
    array = np.asarray(rotated, dtype=np.float32)
    height, width = array.shape
    half = width // 2
    left = array[:, :half]
    right = np.fliplr(array[:, width - half:])
    return float(np.mean(np.abs(left - right)) / (np.mean(array) + 1e-6))


def _estimate_rotation(image: Image.Image) -> tuple[int, float]:
    """用左右对称性估计小角度旋转。

    只在 -8°~8° 内搜索，且对称性提升达到阈值才旋转；正常胸片不会被强行旋转。
    """
    gray = ImageOps.grayscale(image).resize((192, 192), Image.Resampling.BILINEAR)
    baseline = _symmetry_score(gray, 0)
    best_angle = 0
    best_score = baseline
    for angle in range(-8, 9, 2):
        if angle == 0:
            continue
        score = _symmetry_score(gray, angle)
        if score < best_score:
            best_angle, best_score = angle, score
    gain = (baseline - best_score) / max(baseline, 1e-6)
    if best_angle != 0 and gain >= 0.08:
        return best_angle, gain
    return 0, 0.0


def preprocess_image(image: Image.Image) -> tuple[Image.Image, dict[str, Any]]:
    """影像预处理：EXIF 方向、轻微旋转、过暗/过曝自动校正。

    不裁剪、不翻转，保持原始构图；所有处理仅在内存完成，不写入原始影像。
    """
    working = ImageOps.exif_transpose(image).convert("RGB")
    before = _metrics(working)
    angle, gain = _estimate_rotation(working)
    if angle:
        working = working.rotate(angle, resample=Image.Resampling.BICUBIC, expand=False)
    exposure_corrected = False
    if before.mean < 50 or before.mean > 205 or before.std < 25:
        working = ImageOps.autocontrast(working, cutoff=1)
        exposure_corrected = True
    after = _metrics(working)
    applied = bool(angle or exposure_corrected)
    metadata = {
        "applied": applied,
        "rotation_degrees": angle,
        "rotation_symmetry_gain": round(gain, 4),
        "exposure_corrected": exposure_corrected,
        "brightness_before": round(before.mean, 1),
        "brightness_after": round(after.mean, 1),
        "contrast_before": round(before.std, 1),
        "contrast_after": round(after.std, 1),
    }
    return working, metadata
