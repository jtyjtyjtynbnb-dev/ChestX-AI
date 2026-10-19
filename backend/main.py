"""FastAPI application for ChestX-AI image diagnosis education."""

from io import BytesIO
import json
import os
from pathlib import Path

from fastapi import Body, FastAPI, File, Form, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

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
from .workflow import workflow_events


app = FastAPI(title="ChestX-AI API", version="2.0.0")
API_PORT = int(os.getenv("CHESTX_API_PORT", "8000"))
SUPPORTED_QWEN_MODELS = {"qwen3.8-flash", "qwen3.8-max"}
FRONTEND_ASSETS = Path(__file__).resolve().parents[1] / "frontend" / "assets"
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


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Normalize missing multipart fields to the public 400 contract."""
    return error_response(400, "缺少图片文件")


def error_response(code: int, message: str) -> JSONResponse:
    """Build the API's fixed error envelope."""
    return JSONResponse(status_code=code, content={"code": code, "message": message, "data": None})


@app.get("/api/health")
def health() -> dict:
    """Return a lightweight liveness response."""
    return {"code": 200, "message": "success", "data": {"service": "chestx-ai", "persistence": "sqlite"}}


@app.get("/api/members")
def list_members() -> dict:
    """Return persisted family members and their diagnosis records from SQLite."""
    return {"code": 200, "message": "success", "data": get_all_members_with_records()}


@app.post("/api/members/sync")
async def sync_members(payload: dict = Body(...)) -> JSONResponse:
    """Synchronize family members and their records from the frontend into SQLite."""
    members = payload.get("members")
    current_member_id = payload.get("current_member_id")
    if not isinstance(members, list):
        return error_response(400, "家庭成员列表格式无效")
    data = await run_in_threadpool(sync_members_payload, members, current_member_id)
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.get("/api/conversations")
def list_conversations(member_id: str | None = None) -> dict:
    """Return persisted AI chat conversations from SQLite."""
    return {"code": 200, "message": "success", "data": {"conversations": get_conversations(member_id)}}


@app.post("/api/conversations/sync")
async def sync_conversations(payload: dict = Body(...)) -> JSONResponse:
    """Synchronize floating AI chat conversations into SQLite."""
    conversations = payload.get("conversations")
    if not isinstance(conversations, list):
        return error_response(400, "会话列表格式无效")
    data = await run_in_threadpool(sync_conversations_payload, conversations)
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": {"conversations": data}})


@app.get("/api/samples/{sample_id}")
def get_sample_image(sample_id: str):
    """Serve only the bundled chest X-ray demo images, never arbitrary paths."""
    from fastapi.responses import FileResponse

    path = SAMPLE_IMAGES.get(sample_id)
    if path is None or not path.is_file():
        return error_response(404, "未找到演示胸片")
    return FileResponse(path, media_type="image/jpeg", filename=path.name)


@app.post("/api/agent/chat")
async def agent_chat(payload: dict = Body(...)) -> JSONResponse:
    """Answer a bounded chat question using Qwen and source-backed RAG."""
    question = payload.get("question", "")
    if not isinstance(question, str) or not question.strip() or len(question) > 500:
        return error_response(400, "问题不能为空且不能超过500个字符")
    history = payload.get("history", [])
    context = payload.get("diagnosis_context")
    if context is not None and not isinstance(context, dict):
        return error_response(400, "影像上下文格式无效")
    try:
        data = await answer_question(question, history, context)
    except ValueError as exc:
        return error_response(400, str(exc))
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.post("/api/agent/chat/stream")
async def agent_chat_stream(payload: dict = Body(...)) -> Response:
    """Stream step transitions, incremental answer tokens, and sources for the floating AI chat."""
    question = payload.get("question", "")
    if not isinstance(question, str) or not question.strip() or len(question) > 500:
        return error_response(400, "问题不能为空且不能超过500个字符")
    history = payload.get("history", [])
    context = payload.get("diagnosis_context")
    if context is not None and not isinstance(context, dict):
        return error_response(400, "影像上下文格式无效")

    async def event_stream():
        def event(name: str, data: dict) -> str:
            return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        try:
            async for event_name, data in stream_answer_question(question, history, context):
                yield event(event_name, data)
        except Exception as exc:
            yield event("error", {"message": str(exc) or "问答流执行失败"})

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
async def update_qwen_settings(payload: dict = Body(...)) -> JSONResponse:
    api_key = payload.get("api_key")
    model = payload.get("model", "qwen3.8-flash")
    persist = bool(payload.get("persist", True))
    if not isinstance(api_key, str) or len(api_key.strip()) > 500:
        return error_response(400, "API Key 格式无效")
    if not isinstance(model, str) or model.strip() not in SUPPORTED_QWEN_MODELS:
        return error_response(400, "仅支持 qwen3.8-flash 或 qwen3.8-max")
    set_runtime_config(api_key, model, persist=persist)
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
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(400, "仅支持 JPG/PNG 图片")
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        return error_response(413, "图片大小不能超过 10MB")
    try:
        image = Image.open(BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        return error_response(400, "图片解析失败，请上传有效的 JPG/PNG 文件")
    try:
        data = await run_in_threadpool(diagnose_image, image)
    except FileNotFoundError:
        return error_response(500, "模型不可用或推理失败")
    except Exception:
        return error_response(500, "模型不可用或推理失败")
    return JSONResponse(status_code=200, content={"code": 200, "message": "success", "data": data})


@app.post("/api/agent/diagnose")
async def agent_diagnose(
    file: UploadFile = File(...),
    question: str = Form(""),
) -> JSONResponse:
    """Run image inference, local retrieval, and an optional Qwen report."""
    if len(question) > 500:
        return error_response(400, "问题长度不能超过500个字符")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(400, "仅支持 JPG/PNG 图片")

    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        return error_response(413, "图片大小不能超过 10MB")

    try:
        image = Image.open(BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        return error_response(400, "图片解析失败，请上传有效的 JPG/PNG 文件")

    try:
        result = None
        async for event_name, data in workflow_events(image, question.strip(), diagnose_image):
            if event_name == "complete":
                result = data
        if result is None:
            raise RuntimeError("Agent workflow returned no result")
    except ValueError as exc:
        return error_response(400, str(exc))
    except FileNotFoundError:
        return error_response(500, "模型不可用或推理失败")
    except Exception:
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
    question: str = Form(""),
) -> Response:
    """Stream actual workflow node transitions and the completed result as SSE."""
    if len(question) > 500:
        return error_response(400, "问题长度不能超过500个字符")
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        return error_response(400, "仅支持 JPG/PNG 图片")
    payload = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        return error_response(413, "图片大小不能超过 10MB")
    try:
        image = Image.open(BytesIO(payload))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, ValueError):
        return error_response(400, "图片解析失败，请上传有效的 JPG/PNG 文件")

    async def event_stream():
        def event(name: str, data: dict) -> str:
            return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"

        try:
            async for event_name, data in workflow_events(image, question.strip(), diagnose_image):
                yield event(event_name, data)
        except FileNotFoundError:
            yield event("error", {"message": "模型不可用或推理失败"})
        except Exception:
            yield event("error", {"message": "Agent 工作流执行失败"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
