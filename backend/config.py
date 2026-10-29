"""Application settings and the shared ten-class prediction vocabulary."""

from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
MODEL_CANDIDATES = (
    BASE_DIR / "model.onnx",
    PROJECT_ROOT / "模型文件" / "model.onnx",
)
MODEL_PATH = next(
    (candidate for candidate in MODEL_CANDIDATES if candidate.exists()),
    MODEL_CANDIDATES[0],
)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MODEL_INPUT_SIZE = (224, 224)
FRONTEND_ORIGINS = ["*"]

DISEASE_LIST = [
    {"code": "no_finding", "name": "No Finding"},
    {"code": "atelectasis", "name": "Atelectasis"},
    {"code": "cardiomegaly", "name": "Cardiomegaly"},
    {"code": "effusion", "name": "Effusion"},
    {"code": "infiltration", "name": "Infiltration"},
    {"code": "mass", "name": "Mass"},
    {"code": "nodule", "name": "Nodule"},
    {"code": "pneumonia", "name": "Pneumonia"},
    {"code": "pneumothorax", "name": "Pneumothorax"},
    {"code": "consolidation", "name": "Consolidation"},
]

DISCLAIMER = "仅供公众健康科普参考，不做医疗诊断依据"
