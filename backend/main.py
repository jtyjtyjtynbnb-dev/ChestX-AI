"""FastAPI application for ChestX-AI image diagnosis education."""

from io import BytesIO
import json
import logging
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException as StarletteHTTPException

from .chat_service import answer_question, stream_answer_question
from .config import ALLOWED_CONTENT_TYPES, FRONTEND_ORIGINS, MAX_UPLOAD_BYTES
from .database import (
    get_all_members_with_records,
    get_conversations,
    init_db,
    sync_conversations_payload,
    sync_members_payload,
)
from .model_infer import diagnose_image
from .qwen_client import DashScopeError, DashScopeQwenClient, runtime_config_status, set_runtime_config
from .schemas import ChatRequest, ConversationsSyncRequest, MembersSyncRequest, QwenSettingsRequest
from .workflow import workflow_events


logger = logging.getLogger(__name__)
app = FastAPI(title="ChestX-AI API", version="2.0.0", debug=False)
FRONTEND_ASSETS = Path(__file__).resolve().parents[1] / "frontend" / "assets"
DIST_DIR = Path(__file__).resolve().parents[1] / "frontend" / "dist"
SAMPLE_IMAGES = {
    "case-high": FRONTEND_ASSETS / "sample_2.jpg",
    "case-medium": FRONTEND_ASSETS / "sample_2.jpg",
    "case-low": FRONTEND_ASSETS / "sample_3.jpg",
    "teaching-pneumonia": FRONTEND_ASSETS / "knowledge" / "source-pneumonia.jpg",
    "teaching-nodule": FRONTEND_ASSETS / "knowledge" / "nodule.jpg",
    "teaching-effusion": FRONTEND_ASSETS / "knowledge" / "effusion.jpg",
    "teaching-pneumothorax": FRONTEND_ASSETS / "knowledge" / "pneumothorax.jpg",
    "teaching-atelectasis": FRONTEND_ASSETS / "knowledge" / "atelectasis.jpg",
    "teaching-edema": FRONTEND_ASSETS / "knowledge" / "edema.jpg",
}
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

init_db()


def error_response(code: int, message: str) -> JSONResponse:
    """Build the API's fixed error envelope."""
    return JSONResponse(status_code=code, content={"code": code, "message": message, "data": None})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """Return a stable envelope; preserve the legacy missing-file message."""
    if any("file" in (item.get("loc") or ()) for item in exc.errors()):
        return error_response(400, "缺少图片文件")
    return error_response(422, "请求参数校验失败，请检查输入")


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) and exc.detail else "请求失败"
    return error_response(exc.status_code, message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
    """Do not leak Python tracebacks to the browser."""
    logger.exception("Unhandled API exception")
    return error_response(500, "服务器内部错误")


async def _read_image_upload(file: UploadFile) -> Image.Image:
    """Validate the multipart image type, size and decodability."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="仅支持 JPG/PNG 图片")
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="图片大小不能超过 10MB")
    try:
        image = Image.open(BytesIO(payload))
        image.load()
        return image
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="图片解析失败，请上传有效的 JPG/PNG 文件") from exc


def _validated_question(question: str) -> str:
    value = question.strip()
    if len(value) > 500:
        raise HTTPException(status_code=400, detail="问题长度不能超过500个字符")
    return value


@app.get("/api/health")
def health() -> dict:
    """Return a lightweight liveness response."""
    return {"code": 200, "message": "success", "data": {"service": "chestx-ai", "persistence": "sqlite"}}


@app.get("/api/members")
def list_members() -> dict:
    """Return persisted family members and their diagnosis records from SQLite."""
    return {"code": 200, "message": "success", "data": get_all_members_with_records()}


@app.post("/api/members/sync")
async def sync_members(payload: MembersSyncRequest) -> JSONResponse:
    """Synchronize family members and their records from the frontend into SQLite."""
    data = await run_in_threadpool(sync_members_payload, payload.members, payload.current_member_id)
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.get("/api/conversations")
def list_conversations(member_id: str | None = Query(default=None, max_length=100)) -> dict:
    """Return persisted AI chat conversations from SQLite."""
    return {"code": 200, "message": "success", "data": {"conversations": get_conversations(member_id)}}


@app.post("/api/conversations/sync")
async def sync_conversations(payload: ConversationsSyncRequest) -> JSONResponse:
    """Synchronize floating AI chat conversations into SQLite."""
    data = await run_in_threadpool(sync_conversations_payload, payload.conversations)
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": {"conversations": data}})


@app.get("/api/samples/{sample_id}")
def get_sample_image(sample_id: str):
    """Serve only the bundled chest X-ray demo images, never arbitrary paths."""
    path = SAMPLE_IMAGES.get(sample_id)
    if path is None or not path.is_file():
        return error_response(404, "未找到演示胸片")
    return FileResponse(path, media_type="image/jpeg", filename=path.name)


@app.post("/api/agent/chat")
async def agent_chat(payload: ChatRequest) -> JSONResponse:
    """Answer a bounded chat question using Qwen and source-backed RAG."""
    try:
        data = await answer_question(payload.question, payload.history, payload.diagnosis_context)
    except ValueError as exc:
        return error_response(400, str(exc))
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.post("/api/agent/chat/stream")
async def agent_chat_stream(payload: ChatRequest) -> Response:
    """Stream step transitions, incremental answer tokens, and sources for the floating AI chat."""
    async def event_stream():
        def event(name: str, data: dict) -> str:
            return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        try:
            async for event_name, data in stream_answer_question(payload.question, payload.history, payload.diagnosis_context):
                yield event(event_name, data)
        except Exception:
            logger.exception("Chat stream failed")
            yield event("error", {"message": "问答流执行失败，请稍后重试"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/settings/qwen")
def get_qwen_settings() -> dict:
    """Return configuration status without ever returning the API key."""
    return {"code": 200, "message": "success", "data": runtime_config_status()}


@app.post("/api/settings/qwen")
async def update_qwen_settings(payload: QwenSettingsRequest) -> dict:
    set_runtime_config(payload.api_key, payload.model, persist=payload.persist)
    return {"code": 200, "message": "success", "data": runtime_config_status()}


@app.post("/api/settings/qwen/test")
async def test_qwen_settings() -> JSONResponse:
    """Make a small live Qwen request and return only a safe status category."""
    client = DashScopeQwenClient()
    if not client.enabled():
        return {"code": 200, "message": "success", "data": {"ok": False, "reason": "qwen_not_configured", "model": client.model}}
    try:
        answer = (await client.generate_chat("请只回复：连接正常")).strip()
        if not answer:
            raise DashScopeError("empty_response")
        return {"code": 200, "message": "success", "data": {"ok": True, "reason": None, "model": client.model}}
    except DashScopeError as exc:
        return {"code": 200, "message": "success", "data": {"ok": False, "reason": str(exc) or "qwen_error", "model": client.model}}
    except Exception:
        return {"code": 200, "message": "success", "data": {"ok": False, "reason": "qwen_error", "model": client.model}}


@app.post("/api/diagnose")
async def diagnose(file: UploadFile = File(...)) -> JSONResponse:
    """Validate an uploaded JPG/PNG, infer probabilities, and return a heatmap."""
    image = await _read_image_upload(file)
    try:
        data = await run_in_threadpool(diagnose_image, image)
    except FileNotFoundError:
        return error_response(500, "模型不可用或推理失败")
    except Exception:
        logger.exception("Diagnosis failed")
        return error_response(500, "模型不可用或推理失败")
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.post("/api/agent/diagnose")
async def agent_diagnose(
    file: UploadFile = File(...),
    question: str = Form("", max_length=500),
) -> JSONResponse:
    """Run image inference, local retrieval, and an optional Qwen report."""
    image = await _read_image_upload(file)
    question = _validated_question(question)

    try:
        result = None
        async for event_name, data in workflow_events(image, question, diagnose_image):
            if event_name == "complete":
                result = data
        if result is None:
            raise RuntimeError("Agent workflow returned no result")
    except ValueError as exc:
        return error_response(400, str(exc))
    except FileNotFoundError:
        return error_response(500, "模型不可用或推理失败")
    except Exception:
        logger.exception("Agent diagnosis failed")
        return error_response(500, "模型不可用或推理失败")

    return JSONResponse(
        status_code=200,
        content={
            "code": 200,
            "message": "success",
            "data": {
                **result,
            },
        },
    )


@app.post("/api/agent/diagnose/stream")
async def agent_diagnose_stream(
    file: UploadFile = File(...),
    question: str = Form("", max_length=500),
) -> Response:
    """Stream actual workflow node transitions and the completed result as SSE."""
    image = await _read_image_upload(file)
    question = _validated_question(question)

    async def event_stream():
        def event(name: str, data: dict) -> str:
            return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        try:
            async for event_name, data in workflow_events(image, question, diagnose_image):
                yield event(event_name, data)
        except FileNotFoundError:
            yield event("error", {"message": "模型不可用或推理失败"})
        except Exception:
            logger.exception("Agent diagnosis stream failed")
            yield event("error", {"message": "Agent 工作流执行失败"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# Deployment layer: serve the prebuilt Vue application from the same origin as the API.
# API routes above are registered first so unknown /api paths remain JSON 404 responses.
if DIST_DIR.is_dir() and (DIST_DIR / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="frontend-assets")


@app.get("/")
def frontend_root() -> Response:
    if not (DIST_DIR / "index.html").is_file():
        return JSONResponse(status_code=503, content={"code": 503, "message": "前端构建产物缺失，请先运行 npm run build", "data": None})
    return FileResponse(DIST_DIR / "index.html", media_type="text/html")


@app.get("/{full_path:path}")
def frontend_spa(full_path: str) -> Response:
    if full_path == "api" or full_path.startswith("api/"):
        return error_response(404, "Not found")
    dist_root = DIST_DIR.resolve()
    if not dist_root.is_dir() or not (dist_root / "index.html").is_file():
        return JSONResponse(status_code=503, content={"code": 503, "message": "前端构建产物缺失，请先运行 npm run build", "data": None})
    target = (dist_root / full_path).resolve()
    if not target.is_relative_to(dist_root):
        return error_response(404, "Not found")
    if target.is_file():
        return FileResponse(target)
    return FileResponse(dist_root / "index.html", media_type="text/html")
