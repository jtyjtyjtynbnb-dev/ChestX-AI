"""ONNX inference and model-attention heatmap generation."""

import base64
from functools import lru_cache
from io import BytesIO

import cv2
import numpy as np
from PIL import Image

from .config import DISEASE_LIST, MODEL_INPUT_SIZE, MODEL_PATH
from .image_quality import preprocess_image
from .uncertainty import assess_uncertainty

try:
    import onnxruntime as ort
except ImportError:  # pragma: no cover - dependency is installed in deployment
    ort = None


@lru_cache(maxsize=1)
def _load_session():
    """Load the ONNX session lazily so API startup works without the large model."""
    if ort is None or not MODEL_PATH.exists():
        raise FileNotFoundError("model.onnx is unavailable")
    return ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])


def _preprocess(image: Image.Image) -> np.ndarray:
    """Convert a PIL image to the NCHW float tensor expected by DenseNet."""
    rgb = image.convert("RGB").resize(MODEL_INPUT_SIZE, Image.Resampling.BILINEAR)
    array = np.asarray(rgb, dtype=np.float32) / 255.0
    array = (array - np.array([0.485, 0.456, 0.406])) / np.array([0.229, 0.224, 0.225])
    return np.transpose(array, (2, 0, 1))[None, ...].astype(np.float32)


def _heatmap_overlay(image: Image.Image, cam: np.ndarray) -> tuple[np.ndarray, str]:
    """Overlay a model-provided 2D activation map and return RGB bytes and base64."""
    source = np.asarray(image.convert("RGB"), dtype=np.uint8)
    cam = np.asarray(cam, dtype=np.float32).squeeze()
    if cam.ndim != 2:
        raise RuntimeError("model CAM output must be a 2D heatmap")
    cam = np.maximum(cam, 0)
    if cam.max() > cam.min():
        cam = (cam - cam.min()) / (cam.max() - cam.min() + 1e-8)
    cam_resized = cv2.resize(
        cam,
        image.size,
        interpolation=cv2.INTER_LINEAR,
    )
    heat = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
    heat = cv2.cvtColor(heat, cv2.COLOR_BGR2RGB)
    overlay = np.clip(
        0.6 * source.astype(np.float32) + 0.4 * heat.astype(np.float32),
        0,
        255,
    ).astype(np.uint8)
    ok, encoded = cv2.imencode(
        ".jpg",
        cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR),
        [cv2.IMWRITE_JPEG_QUALITY, 85],
    )
    if not ok:
        raise RuntimeError("heatmap encoding failed")
    return overlay, base64.b64encode(encoded.tobytes()).decode("ascii")


def diagnose_image(image: Image.Image) -> dict:
    """Run ONNX inference and return the fixed frontend response payload."""
    # 预处理只在内存中完成：EXIF 方向、轻微旋转、过暗/过曝自动校正。
    # 预处理后的图会随结果返回，热力图与显示图使用同一坐标系，避免叠加错位。
    processed, preprocessing = preprocess_image(image)
    session = _load_session()
    input_name = session.get_inputs()[0].name
    outputs = session.run(None, {input_name: _preprocess(processed)})
    if len(outputs) != 2:
        raise RuntimeError("model must export logits and a CAM output")
    logits = np.asarray(outputs[0], dtype=np.float32)
    if logits.shape != (1, len(DISEASE_LIST)):
        raise RuntimeError("model output class count does not match DISEASE_LIST")
    raw = logits[0]
    probabilities = 1.0 / (1.0 + np.exp(-raw))
    if probabilities.size != len(DISEASE_LIST):
        raise RuntimeError("model output class count does not match DISEASE_LIST")
    items = []
    for disease, probability in zip(DISEASE_LIST, probabilities, strict=True):
        percent = round(float(probability) * 100, 1)
        items.append(
            {
                **disease,
                "probability": float(probability),
                "prob": percent,
                "desc": f"{disease['name']} 预测概率{percent:.1f}%，仅科普参考，不做医疗诊断",
            }
        )
    sorted_items = sorted(items, key=lambda item: item["probability"], reverse=True)
    overlay, heatmap = _heatmap_overlay(processed, outputs[1])
    normalized_image = None
    if preprocessing.get("applied"):
        buffer = BytesIO()
        processed.save(buffer, format="JPEG", quality=88)
        normalized_image = "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    return {
        "top_prediction": sorted_items[0],
        "all_predictions": sorted_items,
        # Keep the existing frontend keys and percent-valued `prob` field.
        "probabilities": sorted_items,
        "heatmap": heatmap,
        "heatmap_overlay": heatmap,
        "normalized_image": normalized_image,
        "preprocessing": preprocessing,
        "uncertainty": assess_uncertainty(sorted_items),
    }
