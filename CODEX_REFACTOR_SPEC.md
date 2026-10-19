# ChestX-AI 全栈改造执行规范 (Codex Execution Spec)

> **使用方式**：将本文档保存至项目根目录（如 `CODEX_SPEC.md` 或 `AGENTS.md`），直接向 Codex 发送指令：
> `请严格按照 CODEX_SPEC.md 中的所有任务（Task 1 ~ Task 6）依次修改代码并运行验收测试。`

## 1. 改造背景与硬性约束 (Hard Constraints)

本项目为 **胸影智识 ChestX-AI**，参赛目标为**传智杯“AI WEB网页开发挑战赛”**（考核标准：基于**主流前端框架**融合**大模型、AI Agent、RAG、多模态 AI** 打造实用优质 AI 原生 Web 应用）。

Codex 在执行代码改造时必须严格遵守以下 **6 条硬性约束**：

1. **主流前端框架合规（Vue 3 架构）**：

   * 将原单文件 `frontend/index.html`（4,515 行原生 DOM 脚本）重构为 **Vue 3 (Composition API) + Pinia 状态管理** 的组件化架构。

   * 同时满足“评委审查 Vue 3 工程源码（`frontend/src/`）”与“跨电脑双击 `start.bat` 免安装 Node.js 直接运行”两个条件。

2. **100% 保留并升级右下角悬浮 AI 对话（Floating AI Copilot）**：

   * 必须保留原有的右下角悬浮按钮（`#aiChatLauncher`）、可拖拽悬浮面板（`#aiChatPanel`）、视口防溢出与位置记忆（`chestx-ai-chat-position`）、多会话历史切换、6 个典型征象教学快捷按钮（`#aiChatTeachingSamples`）、Agent 工作流步骤折叠面板以及引用来源链接（`.ai-chat-source`）。

   * 新增 **SSE 逐字流式输出**（`/api/agent/chat/stream`）、**当前家庭成员画像自动注入**、以及**回复气泡底部主视图联动按钮**（一键高亮主看片台 Grad-CAM 热力图、一键将就医问题清单存入当前成员档案备注）。

3. **家庭成员与会话后端持久化（SQLite + LocalStorage 双写）**：

   * 使用 Python 标准库内置 `sqlite3`（零额外依赖体积）在 `backend/database.py` 中实现服务端数据库落盘（存储路径 `backend/data/chestx.db`，运行时自动初始化）。

   * 前端新建/修改/删除家庭成员、保存胸片解读记录、保存悬浮问答会话时，采用 **LocalStorage 乐观更新 + 后端 SQLite 异步同步**，彻底解决刷新、换浏览器或跨电脑访问丢失数据的问题。

4. **Qwen 配置持久化**：

   * 在网页设置弹窗中修改 DashScope API Key 与模型（`qwen3.8-flash` / `qwen3.8-max`）时，除更新内存变量外，同步安全写入 `backend/.env`，重启后端不丢失。

5. **外链静态资源本地化（离线防白屏）**：

   * 将原 `index.html` 中引用的外网 CDN（Tailwind、ECharts、Vue 3 运行时）沉淀至 `frontend/vendor/` 本地目录，确保评审环境在弱网或内网下界面样式与图表 100% 正常渲染。

6. **ZIP 发布包严格小于 200 MB（目标 \~32 MB）**：

   * 严禁在 `requirements.txt` 中引入 PyTorch 等 GB 级依赖，继续使用 `onnxruntime` 运行 `backend/model.onnx`（26.96 MB）。

   * 提供 `pack_demo.py` 自动剔除 `.venv/`、`node_modules/`、`__pycache__/`、`*.db` 等运行期文件。

## 2. 现有代码库结构与改造后目标目录树

| 路径 | 动作 | 说明 | 
| ----- | ----- | ----- | 
| `backend/database.py` | **NEW (新增)** | 基于内置 `sqlite3` 的家庭成员、诊断记录、问答会话 CRUD 持久层 | 
| `backend/qwen_client.py` | **MODIFY (修改)** | 新增 `stream_chat()` 流式生成方法，支持将 API Key 持久化写回 `.env` | 
| `backend/chat_service.py` | **MODIFY (修改)** | 支持注入当前家庭成员画像（年龄/性别/既往病史），新增 `stream_answer_question()` SSE 生成器 | 
| `backend/main.py` | **MODIFY (修改)** | 挂载 `/api/agent/chat/stream`、`/api/members`、`/api/members/sync`、`/api/conversations` 接口 | 
| `frontend/package.json` | **NEW (新增)** | 标准 Vue 3 + Pinia + Vite 工程声明文件（供赛事评委审查工程化规范） | 
| `frontend/src/store/chestxStore.js` | **NEW (新增)** | Pinia / Reactive 全局状态中心（封装家庭成员、胸片记录、双写同步逻辑） | 
| `frontend/src/components/FloatingAiChat.vue` | **NEW (新增)** | 右下角可拖拽悬浮 AI 助手组件（含 SSE 流式渲染、步骤状态机、画布联动按钮） | 
| `frontend/src/components/FamilyMemberModal.vue` | **NEW (新增)** | 家庭成员档案 CRUD、健康统计与 Qwen API 设置组件 | 
| `frontend/src/components/XrayWorkbench.vue` | **NEW (新增)** | 多模态看片台组件（缩放、反色、Grad-CAM 热力图层控制、LangGraph 节点进度条） | 
| `frontend/src/components/ArchiveTimeline.vue` | **NEW (新增)** | 家庭成员历次胸片时间轴、多条件筛选、前后胸片双栏复查对比与科普报告打印 | 
| `frontend/index.html` | **MODIFY (修改)** | 挂载 Vue 3 组件化应用，保持全部原有 `id` 选择器兼容自动化测试 | 
| `pack_demo.py` | **NEW (新增)** | 自动化打包与 `<200MB` 体积校验脚本 | 

## 3. 分步实施细则 (Step-by-Step Tasks for Codex)

### Task 1: 创建 SQLite 持久化模块 (`backend/database.py`)

创建 `backend/database.py`，使用 Python 标准库 `sqlite3` 实现线程安全的持久化存储。数据库文件固定在 `backend/data/chestx.db`（目录不存在时自动创建）。

#### 1.1 数据表 Schema

```
CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age TEXT DEFAULT '',
    gender TEXT DEFAULT '未填写',
    age_group TEXT DEFAULT '',
    conditions TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnosis_records (
    id TEXT PRIMARY KEY,
    member_id TEXT NOT NULL,
    case_code TEXT DEFAULT '',
    title TEXT NOT NULL,
    date_str TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    attention_region TEXT DEFAULT '',
    probabilities_json TEXT NOT NULL,
    report_json TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    member_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    messages_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

```

#### 1.2 必选实现函数 (`backend/database.py`)

```
"""SQLite persistence layer for family members, diagnosis records, and AI chat history."""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any

DB_DIR = Path(__file__).resolve().parent / "data"
DB_PATH = DB_DIR / "chestx.db"
_DB_LOCK = threading.Lock()


def _connect() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    with _DB_LOCK, _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS family_members (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                age TEXT DEFAULT '',
                gender TEXT DEFAULT '未填写',
                age_group TEXT DEFAULT '',
                conditions TEXT DEFAULT '',
                notes TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS diagnosis_records (
                id TEXT PRIMARY KEY,
                member_id TEXT NOT NULL,
                case_code TEXT DEFAULT '',
                title TEXT NOT NULL,
                date_str TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                image_url TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                attention_region TEXT DEFAULT '',
                probabilities_json TEXT NOT NULL,
                report_json TEXT DEFAULT '{}',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (member_id) REFERENCES family_members(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id TEXT PRIMARY KEY,
                member_id TEXT DEFAULT '',
                title TEXT NOT NULL,
                messages_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )


def get_all_members_with_records() -> dict[str, Any]:
    init_db()
    with _DB_LOCK, _connect() as conn:
        member_rows = conn.execute(
            "SELECT * FROM family_members ORDER BY created_at ASC"
        ).fetchall()
        record_rows = conn.execute(
            "SELECT * FROM diagnosis_records ORDER BY created_at DESC"
        ).fetchall()
        cur_row = conn.execute(
            "SELECT value FROM app_state WHERE key = 'current_member_id'"
        ).fetchone()

    records_by_member: dict[str, list[dict[str, Any]]] = {}
    for r in record_rows:
        rec = {
            "id": r["id"],
            "code": r["case_code"],
            "title": r["title"],
            "date": r["date_str"],
            "riskLevel": r["risk_level"],
            "imageUrl": r["image_url"],
            "summary": r["summary"],
            "attentionRegion": r["attention_region"],
            "probabilities": json.loads(r["probabilities_json"] or "[]"),
            "report": json.loads(r["report_json"] or "{}"),
        }
        records_by_member.setdefault(r["member_id"], []).append(rec)

    members = []
    for m in member_rows:
        members.append({
            "id": m["id"],
            "profile": {
                "name": m["name"],
                "age": m["age"],
                "gender": m["gender"],
                "ageGroup": m["age_group"],
                "conditions": m["conditions"],
                "notes": m["notes"],
            },
            "records": records_by_member.get(m["id"], []),
        })

    return {
        "current_member_id": cur_row["value"] if cur_row else (members[0]["id"] if members else None),
        "members": members,
    }


def sync_members_payload(members: list[dict[str, Any]], current_member_id: str | None) -> dict[str, Any]:
    """Full atomic upsert of family members and their records from frontend state."""
    init_db()
    now_ms = int(time.time() * 1000)
    with _DB_LOCK, _connect() as conn:
        incoming_ids = [str(m.get("id")) for m in members if m.get("id")]
        if incoming_ids:
            placeholders = ",".join("?" for _ in incoming_ids)
            conn.execute(
                f"DELETE FROM family_members WHERE id NOT IN ({placeholders})",
                incoming_ids,
            )
        for idx, m in enumerate(members):
            mid = str(m.get("id") or f"member-{now_ms}-{idx}")
            prof = m.get("profile") or {}
            conn.execute(
                """
                INSERT INTO family_members (id, name, age, gender, age_group, conditions, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name,
                    age=excluded.age,
                    gender=excluded.gender,
                    age_group=excluded.age_group,
                    conditions=excluded.conditions,
                    notes=excluded.notes,
                    updated_at=excluded.updated_at
                """,
                (
                    mid,
                    str(prof.get("name") or "未命名成员")[:40],
                    str(prof.get("age") or ""),
                    str(prof.get("gender") or "未填写"),
                    str(prof.get("ageGroup") or ""),
                    str(prof.get("conditions") or "")[:500],
                    str(prof.get("notes") or "")[:1000],
                    now_ms + idx,
                    now_ms,
                ),
            )
            conn.execute("DELETE FROM diagnosis_records WHERE member_id = ?", (mid,))
            for r_idx, rec in enumerate(m.get("records") or []):
                rid = str(rec.get("id") or f"rec-{now_ms}-{r_idx}")
                conn.execute(
                    """
                    INSERT INTO diagnosis_records (
                        id, member_id, case_code, title, date_str, risk_level,
                        image_url, summary, attention_region, probabilities_json, report_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rid,
                        mid,
                        str(rec.get("code") or ""),
                        str(rec.get("title") or "胸部正位 X 光筛查"),
                        str(rec.get("date") or ""),
                        str(rec.get("riskLevel") or "LOW"),
                        str(rec.get("imageUrl") or ""),
                        str(rec.get("summary") or ""),
                        str(rec.get("attentionRegion") or ""),
                        json.dumps(rec.get("probabilities") or [], ensure_ascii=False),
                        json.dumps(rec.get("report") or {}, ensure_ascii=False),
                        now_ms - r_idx,
                    ),
                )
        if current_member_id:
            conn.execute(
                """
                INSERT INTO app_state (key, value) VALUES ('current_member_id', ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value
                """,
                (str(current_member_id),),
            )
    return get_all_members_with_records()


def get_conversations(member_id: str | None = None) -> list[dict[str, Any]]:
    init_db()
    with _DB_LOCK, _connect() as conn:
        if member_id:
            rows = conn.execute(
                "SELECT * FROM chat_conversations WHERE member_id = ? OR member_id = '' ORDER BY updated_at DESC LIMIT 50",
                (member_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM chat_conversations ORDER BY updated_at DESC LIMIT 50"
            ).fetchall()
    return [
        {
            "id": row["id"],
            "memberId": row["member_id"],
            "title": row["title"],
            "updatedAt": row["updated_at"],
            "messages": json.loads(row["messages_json"] or "[]"),
        }
        for row in rows
    ]


def sync_conversations_payload(conversations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    init_db()
    now_ms = int(time.time() * 1000)
    with _DB_LOCK, _connect() as conn:
        for conv in conversations[-50:]:
            cid = str(conv.get("id") or "")
            if not cid:
                continue
            conn.execute(
                """
                INSERT INTO chat_conversations (id, member_id, title, messages_json, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    member_id=excluded.member_id,
                    title=excluded.title,
                    messages_json=excluded.messages_json,
                    updated_at=excluded.updated_at
                """,
                (
                    cid,
                    str(conv.get("memberId") or ""),
                    str(conv.get("title") or "新建对话")[:60],
                    json.dumps(conv.get("messages") or [], ensure_ascii=False),
                    int(conv.get("updatedAt") or now_ms),
                ),
            )
    return get_conversations()

```

### Task 2: 升级 `backend/qwen_client.py` 与 `backend/chat_service.py`

#### 2.1 在 `backend/qwen_client.py` 中持久化配置并支持流式生成

1. 修改 `set_runtime_config(api_key: str | None, model: str | None = None, persist: bool = True)`：

   * 更新 `_runtime_api_key` 和 `_runtime_model` 的同时，当 `persist=True` 时，安全读取并更新 `backend/.env` 中的 `DASHSCOPE_API_KEY` 与 `QWEN_MODEL`（保留其他环境变量不变）。

2. 在 `DashScopeQwenClient` 中新增流式对话方法 `stream_chat(self, prompt: str) -> AsyncIterator[str]`：

   * 若 DashScope 返回流式 chunks 或一次性返回文本，统一通过异步生成器逐段 `yield` 增量文本（每次 4\~12 个字符或按 SSE delta），确保前端打字机流式体验。

#### 2.2 在 `backend/chat_service.py` 中注入家庭成员画像并新增 `stream_answer_question()`

1. 扩展 `build_chat_prompt(question, history, documents, diagnosis_context)`：

   * 从 `diagnosis_context` 中提取 `member_profile`（包含 `name`、`age`、`gender`、`conditions`、`notes`）：

     ```
     member_info = (diagnosis_context or {}).get("member_profile") or {}
     member_desc = (
         f"姓名：{member_info.get('name', '未填写')}，"
         f"年龄：{member_info.get('age', '未填写')}，"
         f"性别：{member_info.get('gender', '未填写')}，"
         f"既往病史/关注项：{member_info.get('conditions', '无')}，"
         f"健康备注：{member_info.get('notes', '无')}"
     ) if member_info else "未指定特定家庭成员"
     
     ```

   * 将 `当前家庭成员健康画像：{member_desc}` 注入 Prompt 中，指导模型结合成员年龄与病史背景给出更有针对性的复查与就医咨询建议（同时严格遵守 `FORBIDDEN_PATTERNS` 医疗免责护栏）。

2. 新增异步生成器 `stream_answer_question(question: str, history: Any = None, diagnosis_context: dict | None = None)`：

   * 依次产出 `(event_name, payload_dict)`：

     * `("step", {"name": "问题理解", "status": "completed"})`

     * `("step", {"name": "知识检索", "status": "completed" | "no_evidence"})`

     * `("token", {"delta": chunk_str})` （将完整回答按语义短句切分流式推送）

     * `("complete", final_result_dict)` （包含 `answer`, `provider`, `steps`, `sources`, `suggested_actions`）

### Task 3: 扩展 `backend/main.py` 路由接口

在 `backend/main.py` 中导入 `database.py` 与 `stream_answer_question`，新增以下端点：

1. `GET /api/members`：调用 `get_all_members_with_records()` 返回服务端存储的家庭成员列表与 `current_member_id`。

2. `POST /api/members/sync`：接收 `{"members": [...], "current_member_id": "..."}`，调用 `sync_members_payload()` 落盘并返回最新状态。

3. `GET /api/conversations` & `POST /api/conversations/sync`：读取和同步悬浮 AI 问答历史会话。

4. `POST /api/agent/chat/stream`：

   ```
   @app.post("/api/agent/chat/stream")
   async def agent_chat_stream(payload: dict = Body(...)) -> Response:
       question = payload.get("question", "")
       if not isinstance(question, str) or not question.strip() or len(question) > 500:
           return error_response(400, "问题不能为空且不能超过500个字符")
       history = payload.get("history", [])
       context = payload.get("diagnosis_context")
       if context is not None and not isinstance(context, dict):
           return error_response(400, "影像上下文格式无效")
   
       async def event_stream():
           def sse(name: str, data: dict) -> str:
               return f"event: {name}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
           try:
               async for ev_name, ev_data in stream_answer_question(question, history, context):
                   yield sse(ev_name, ev_data)
           except Exception as exc:
               yield sse("error", {"message": str(exc) or "问答流执行失败"})
   
       return StreamingResponse(
           event_stream(),
           media_type="text/event-stream",
           headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
       )
   
   ```

### Task 4: 改造前端为 Vue 3 架构并实现双写同步 (`frontend/`)

为满足**传智杯“基于主流前端框架”**考核要求，同时保证**双击 `start.bat` 无需安装 Node.js 即可运行**：

1. **创建标准工程配置文件**：

   * 创建 `frontend/package.json`（声明 `"vue": "^3.5.0"`, `"pinia": "^2.2.0"`, `"echarts": "^5.5.1"`, `"vite": "^5.4.0"`）。

   * 创建 `frontend/src/` 目录，将业务逻辑按职责模块化拆分为：

     * `frontend/src/store/chestxStore.js`：统一管理 `AppState`（`familyMembers`、`currentMemberId`、`currentCase`、`conversations`），封装 `initFromBackend()`、`persistFamilyMembers()`（同时写 `localStorage` 与 `POST /api/members/sync`）以及 `persistConversations()`（同时写 `localStorage` 与 `POST /api/conversations/sync`）。

     * `frontend/src/components/FloatingAiChat.js`（及对应 `.vue` 单文件组件源码）：封装右下角可拖拽悬浮 AI 问答窗。

     * `frontend/src/components/FamilyMemberManager.js`（及对应 `.vue` 单文件组件源码）：封装家庭成员切换、新增、删除与档案表单校验。

     * `frontend/src/components/CopilotBridge.js`：实现悬浮 AI 问答窗与主看片台（Grad-CAM 热力图高亮、写入成员随访备注、加载教学病例到主看片台）的双向事件总线。

2. **保持 DOM ID 100% 向下兼容**：

   * 所有原有的关键 DOM ID（如 `#aiChatLauncher`、`#aiChatPanel`、`#aiChatHeader`、`#aiChatMessages`、`#aiChatInput`、`#aiChatSendBtn`、`#aiChatTeachingSamples`、`#familyMemberList`、`#newMemberBtn`、`#deleteMemberBtn`、`#userProfileForm`）必须完整保留，确保任何自动化评测脚本与现有 CSS 样式无缝工作。

### Task 5: 悬浮 AI 对话 (`FloatingAiChat`) 专项升级要求

在保留原有拖拽、位置记忆、会话切换、6 个快捷教学按钮的基础上，完成以下 4 项具体改造：

1. **显示当前关联家庭成员与胸片状态条**：

   * 在悬浮面板头部 `#aiChatHeader` 下方增加轻量状态栏 `#aiChatContextBanner`，实时显示：
     `当前档案：[成员姓名（年龄/性别）] ｜ 关联影像：[当前病例标题]`。

2. **接入 `/api/agent/chat/stream` 流式渲染**：

   * 修改 `sendAiChatMessage(question)`：优先请求 `POST /api/agent/chat/stream`，通过 `response.body.getReader()` + `TextDecoder` 实时解析 SSE 事件：

     * 收到 `event: step` 时，实时更新气泡内的步骤状态标签（`问题理解` $\to$ `知识检索` $\to$ `Qwen 生成`）。

     * 收到 `event: token` 时，将 `delta` 增量追加至助手气泡正文，消除白屏等待感。

     * 若流式接口不可用，自动回退至原有的 `POST /api/agent/chat` 同步接口。

3. **注入家庭成员画像与历史记录**：

   * 修改 `currentChatDiagnosisContext()`：

     ```
     function currentChatDiagnosisContext() {
       const result = AppState.currentCase?.agentResult;
       const member = getCurrentMember();
       return {
         probabilities: (result?.inference?.probabilities || []).slice(0, 5),
         summary: result?.report?.summary || '',
         member_profile: member ? {
           id: member.id,
           name: member.profile.name,
           age: member.profile.age,
           gender: member.profile.gender,
           conditions: member.profile.conditions,
           notes: member.profile.notes,
           record_count: (member.records || []).length
         } : null
       };
     }
     
     ```

4. **新增回复气泡底部画布联动操作栏（Copilot Action Bar）**：

   * 在每条 AI 回复气泡底部（引用来源下方）渲染两个联动按钮：

     * **「定位高激活热区」**：点击后自动切换到“影像智能解读”标签页，开启热力图开关（`#toggleHeatmapBtn`），将透明度滑块调至 `75%`，并平滑滚动至看片台 `#xrayViewerContainer`。

     * **「记入成员随访备注」**：点击后将本条 AI 回答的核心建议摘要自动追加到当前家庭成员 `member.profile.notes` 中，调用 `persistFamilyMembers('chat_note_append')` 同步保存至后端 SQLite，并弹出 Toast 提示 `已追加至「xxx」的随访备注`。

5. **全局快捷键唤起**：

   * 监听 `window` 的 `keydown` 事件：按下 `Alt + K`（或 `Ctrl + K` / `Meta + K`）时自动切换悬浮 AI 问答面板的展开/收起状态，并在展开时聚焦 `#aiChatInput`。

### Task 6: 新增一键干净打包脚本 (`pack_demo.py`)

在项目根目录创建 `pack_demo.py`，用于生成符合 `<200MB` 限制的参赛提交包：

```
"""Build a clean, cross-computer competition ZIP package strictly under 200 MB."""

import os
import zipfile
from pathlib import Path

EXCLUDE_DIRS = {".venv", "venv", "__pycache__", ".git", "node_modules", "data", ".pytest_cache"}
EXCLUDE_EXTS = {".pyc", ".pyo", ".log", ".pid", ".db", ".sqlite3"}


def build_package(source_dir: str = ".", out_zip: str = "ChestX-AI-参赛演示包.zip") -> float:
    src_path = Path(source_dir).resolve()
    out_path = Path(out_zip).resolve()
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(src_path):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                fp = Path(root) / file
                if fp == out_path or fp.suffix.lower() in EXCLUDE_EXTS:
                    continue
                arcname = Path("ChestX-AI-演示运行包") / fp.relative_to(src_path)
                zf.write(fp, arcname)
    size_mb = out_path.stat().st_size / (1024 * 1024)
    assert size_mb < 200.0, f"Package exceeded 200MB limit: {size_mb:.2f} MB"
    print(f"[OK] Built {out_path.name}: {size_mb:.2f} MB (limit: 200.00 MB)")
    return size_mb


if __name__ == "__main__":
    build_package()

```

## 4. 改造完成后的自动化验收清单 (Verification Checklist)

Codex 完成上述所有代码修改后，必须依次执行以下验证命令并确保全部通过：

1. **后端接口与 SQLite 持久化自测**：

   ```
   python3 -c "
   from fastapi.testclient import TestClient
   from backend.main import app
   
   client = TestClient(app)
   # 1. 验证健康检查
   assert client.get('/api/health').status_code == 200
   
   # 2. 验证新建家庭成员同步落盘
   sync_payload = {
       'current_member_id': 'member-test-01',
       'members': [
           {
               'id': 'member-test-01',
               'profile': {'name': '张建国', 'age': '62', 'gender': '男', 'conditions': '慢阻肺病史', 'notes': '定期复查'},
               'records': []
           },
           {
               'id': 'member-test-02',
               'profile': {'name': '李秀英', 'age': '58', 'gender': '女', 'conditions': '无', 'notes': '新建家庭成员测试'},
               'records': []
           }
       ]
   }
   res = client.post('/api/members/sync', json=sync_payload)
   assert res.status_code == 200
   loaded = client.get('/api/members').json()['data']
   assert len(loaded['members']) == 2
   assert loaded['members'][1]['profile']['name'] == '李秀英'
   
   # 3. 验证悬浮 AI 问答 SSE 流式接口与成员画像注入
   stream_res = client.post('/api/agent/chat/stream', json={
       'question': '胸腔积液在胸片上有什么表现？',
       'history': [],
       'diagnosis_context': {
           'probabilities': [{'code': 'Effusion', 'name': '胸腔积液', 'prob': 72.5}],
           'summary': '右侧肋膈角变钝',
           'member_profile': loaded['members'][0]['profile']
       }
   })
   assert stream_res.status_code == 200
   assert 'event: step' in stream_res.text
   assert 'event: complete' in stream_res.text
   print('ALL BACKEND & persistence TESTS PASSED!')
   "
   
   ```

2. **打包体积红线校验**：

   ```
   python3 pack_demo.py
   
   ```

   确认输出的 ZIP 文件体积 `< 50 MB`（远小于 200 MB 上限），且不包含 `.venv`、`node_modules` 或 `.db` 脏数据。