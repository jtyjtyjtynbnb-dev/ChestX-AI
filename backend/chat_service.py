"""Evidence-grounded Qwen chat answers and SSE streaming for the floating health assistant."""

from __future__ import annotations

import asyncio
import json
import re
from collections.abc import AsyncIterator
from typing import Any

from .config import DISCLAIMER
from .qwen_client import DashScopeError, DashScopeQwenClient
from .rag.retriever import retrieve_knowledge
from .semantic_cache import SemanticAnswerCache
from .safety import has_unsafe_clinical_language, sanitize_text


FORBIDDEN_PATTERNS = ("已确诊", "可以确诊", "排除疾病", "一定是", "百分之百", "立即服药", "自行用药")
_PUNCTUATION_ONLY = re.compile(r"^[?？!！。\.，,、…~～]+$")


def _local_intent_answer(question: str) -> str | None:
    """Handle conversational inputs before retrieval can attach unrelated evidence."""
    normalized = re.sub(r"\s+", "", question).lower()
    if normalized in {"你好", "您好", "嗨", "hi", "hello", "在吗"}:
        return "你好，我是影像问答助手。我可以解释胸片术语、说明常见影像线索，并结合当前家庭成员档案与病例结果整理需要向医生确认的问题。"
    if normalized in {"你能做什么", "你可以做什么", "有什么功能", "怎么用", "帮助", "功能"}:
        return (
            "我可以：1）解释胸片报告中的术语；2）说明肺炎、积液、气胸、结节等常见影像线索；"
            "3）结合当前家庭成员档案与模型结果梳理下一步咨询方向。聊天是否调用 Qwen 取决于设置页中的配置状态；"
            "未启用时使用本地医学知识库，启用后回答会结合 Qwen 和检索到的来源。"
        )
    if _PUNCTUATION_ONLY.fullmatch(normalized) or len(normalized) <= 1:
        return "请告诉我你具体想了解什么，例如“胸腔积液在胸片上有什么表现？”或“报告里的肺部浸润影是什么意思？”"
    if any(term in normalized for term in ("胸部鼓起", "胸口鼓起", "胸壁隆起", "胸廓不对称")):
        return (
            "“胸部鼓起”不是一个标准的胸片诊断名称，可能描述胸壁局部隆起、胸廓不对称，"
            "也可能是呼吸时的外观变化。请补充出现时间、是否单侧、是否伴有胸痛或呼吸困难；"
            "如症状突然出现或正在加重，请及时就医。"
        )
    return None


def _clean_history(history: Any) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []
    cleaned = []
    for item in history[-8:]:
        if not isinstance(item, dict) or item.get("role") not in {"user", "assistant"}:
            continue
        content = str(item.get("content", "")).strip()[:1200]
        if content:
            cleaned.append({"role": item["role"], "content": content})
    return cleaned


def _format_member_profile(diagnosis_context: dict | None) -> str:
    if not isinstance(diagnosis_context, dict):
        return "未指定特定家庭成员"
    profile = diagnosis_context.get("member_profile")
    if not isinstance(profile, dict) or not profile:
        return "未指定特定家庭成员"
    parts = [
        f"姓名：{profile.get('name') or '未填写'}",
        f"年龄：{profile.get('age') or '未填写'}",
        f"性别：{profile.get('gender') or '未填写'}",
    ]
    if profile.get("conditions"):
        parts.append(f"既往病史/关注项：{profile.get('conditions')}")
    if profile.get("notes"):
        parts.append(f"随访备注：{profile.get('notes')}")
    return "，".join(parts)


def build_chat_prompt(
    question: str,
    history: list[dict[str, str]],
    documents: list[dict],
    diagnosis_context: dict | None,
) -> str:
    evidence = "\n\n".join(
        f"[{item['id']}] {item['title']}\n{item['content']}\n来源：{item['source']} ({item['source_url']})"
        for item in documents
    ) or "无匹配知识片段"
    member_desc = _format_member_profile(diagnosis_context)
    context = json.dumps(diagnosis_context or {}, ensure_ascii=False)[:4000]
    transcript = "\n".join(f"{item['role']}: {item['content']}" for item in history) or "无"
    return f"""你是 ChestX-AI 的健康科普问答助手。请用简洁、易懂的中文回答用户问题。
用户问题：{question}
当前家庭成员健康画像：{member_desc}
对话历史：{transcript}
当前影像工作流上下文（仅作参考）：{context}
可引用的医学知识片段：
{evidence}

要求：
1. 只能依据给出的知识片段和上下文回答；不得编造来源、检查结果或概率。
2. 如果用户在问当前报告，优先解释 patient_summary、risk_explanation 或 follow_up_questions，不要改变模型概率。
3. 患者版用通俗语言；如果用户是医生语气，可用规范影像描述，但仍不能确诊。
4. 若当前家庭成员有年龄或既往病史信息，可提示复查对比或向医生说明该背景。
5. 不能声称确诊、排除疾病或替代医生；不能给出自行用药或急救处方；信息不足时明确说需要医生结合病史和检查判断。
6. 回答最后必须包含：{DISCLAIMER}。
7. 只返回回答正文，不要 JSON，不要 Markdown 标题；引用来源时使用片段标题。"""


def _local_answer(
    question: str,
    documents: list[dict],
    failure_reason: str | None = None,
    diagnosis_context: dict | None = None,
) -> dict[str, Any]:
    intent_answer = _local_intent_answer(question)
    if intent_answer:
        return {"answer": f"{intent_answer} {DISCLAIMER}。", "provider": "local_fallback", "sources": []}
    member_profile = (diagnosis_context or {}).get("member_profile") if isinstance(diagnosis_context, dict) else None
    member_prefix = ""
    if isinstance(member_profile, dict) and member_profile.get("name"):
        cond = member_profile.get("conditions")
        if cond and cond != "无":
            member_prefix = f"结合当前家庭成员「{member_profile['name']}」（既往关注：{cond}）的档案背景，"
        else:
            member_prefix = f"结合当前家庭成员「{member_profile['name']}」的档案，"
    if documents:
        lead = documents[0]
        answer = f"{member_prefix}根据知识库，{lead['content']} 如需结合具体情况判断，还需要医生参考症状、病史和其他检查。{DISCLAIMER}。"
    else:
        answer = f"{member_prefix}暂时没有检索到与问题直接相关的知识片段，建议携带影像和症状咨询正规医疗机构。{DISCLAIMER}。"
    response = {
        "answer": answer,
        "provider": "local_fallback",
        "sources": [
            {key: item[key] for key in ("id", "title", "source", "source_url")}
            for item in documents[:4]
        ],
    }
    if failure_reason:
        response["failure_reason"] = failure_reason
    return response


def _chat_steps(retrieval: str, qwen: str, answer: str = "completed") -> list[dict[str, str]]:
    return [
        {"name": "问题理解", "status": "completed"},
        {"name": "知识检索", "status": retrieval},
        {"name": "Qwen 生成", "status": qwen},
        {"name": "整理回答与来源", "status": answer},
    ]


_CHAT_SEMANTIC_CACHE = SemanticAnswerCache()


async def answer_question(question: str, history: Any = None, diagnosis_context: dict | None = None) -> dict[str, Any]:
    question = question.strip()
    if not question or len(question) > 500:
        raise ValueError("问题不能为空且不能超过500个字符")
    history = _clean_history(history)
    cached = _CHAT_SEMANTIC_CACHE.get(question, diagnosis_context)
    if cached is not None:
        cached["cached"] = True
        return cached
    if _local_intent_answer(question):
        response = _local_answer(question, [], diagnosis_context=diagnosis_context)
        response["steps"] = _chat_steps("skipped", "skipped")
        _CHAT_SEMANTIC_CACHE.set(question, response, diagnosis_context)
        return response
    predicted = [
        str(item.get("code"))
        for item in (diagnosis_context or {}).get("probabilities", [])[:3]
        if isinstance(item, dict) and item.get("code")
    ]
    documents = retrieve_knowledge(predicted, question, top_k=10)
    client = DashScopeQwenClient()
    if not client.enabled():
        response = _local_answer(question, documents, "qwen_not_configured", diagnosis_context=diagnosis_context)
        response["steps"] = _chat_steps("completed" if documents else "no_evidence", "skipped")
        _CHAT_SEMANTIC_CACHE.set(question, response, diagnosis_context)
        return response
    try:
        answer = (await client.generate_chat(build_chat_prompt(question, history, documents, diagnosis_context))).strip()
        if not answer or any(pattern in answer for pattern in FORBIDDEN_PATTERNS):
            raise ValueError("unsafe chat answer")
        success = {
            "answer": answer,
            "provider": "qwen",
            "steps": _chat_steps("completed" if documents else "no_evidence", "completed"),
            "sources": [
                {key: item[key] for key in ("id", "title", "source", "source_url")}
                for item in documents[:4]
            ],
        }
        _CHAT_SEMANTIC_CACHE.set(question, success, diagnosis_context)
        return success
    except Exception as exc:
        failure_reason = str(exc) if isinstance(exc, DashScopeError) and str(exc) else "qwen_error"
        response = _local_answer(question, documents, failure_reason, diagnosis_context=diagnosis_context)
        response["steps"] = _chat_steps("completed" if documents else "no_evidence", "failed", "degraded")
        _CHAT_SEMANTIC_CACHE.set(question, response, diagnosis_context)
        return response


def _local_note_summary(text: str) -> str:
    """Extractive fallback used when Qwen is unavailable for note summarization."""
    clean = str(text or "").replace(DISCLAIMER, "").replace("仅供公众健康科普参考", "")
    clean = re.sub(r"\s+", " ", clean).strip()
    sentences = [item.strip() for item in re.split(r"(?<=[。！？!?])", clean) if item.strip()]
    summary = "".join(sentences[:2])[:80].strip("，；。 ")
    if not summary:
        summary = "AI 回答提示需关注影像征象，建议携带影像咨询医生。"
    summary = sanitize_text(summary)
    if has_unsafe_clinical_language(summary):
        summary = "AI 回答提示需关注影像征象，建议携带影像咨询医生。"
    return summary


async def summarize_note(text: str) -> dict[str, str]:
    """Summarize an AI answer into a short, safe follow-up note (text only)."""
    clean = re.sub(r"\s+", " ", str(text or "")).strip()
    fallback = _local_note_summary(clean)
    client = DashScopeQwenClient()
    if not client.enabled() or len(clean) < 20:
        return {"summary": fallback, "provider": "local_fallback"}
    prompt = f"""请把下面的健康科普问答压缩成一条“随访备注”，要求：
1. 不超过80字；
2. 保留模型关注的征象、建议的检查/随访方向、需要就医的提示；
3. 不得写确诊、排除疾病、自行用药或治疗处方；
4. 只输出备注正文，不要标题、引号或 Markdown。

原文：
{clean[:3000]}"""
    try:
        summary = await asyncio.wait_for(client.generate_chat(prompt, max_tokens=180), timeout=20)
        summary = re.sub(r"\s+", " ", str(summary or "")).strip().strip('"“”')
        summary = re.sub(r"^(摘要|随访备注)[:：\s]*", "", summary)
        summary = sanitize_text(summary)[:100].strip("，；。 ")
        if not summary or has_unsafe_clinical_language(summary):
            return {"summary": fallback, "provider": "local_fallback"}
        return {"summary": summary, "provider": "qwen"}
    except Exception:
        return {"summary": fallback, "provider": "local_fallback"}


async def stream_answer_question(
    question: str,
    history: Any = None,
    diagnosis_context: dict | None = None,
) -> AsyncIterator[tuple[str, dict[str, Any]]]:
    """Stream step updates, incremental text tokens, and final metadata as SSE tuples."""
    clean_q = question.strip()
    if not clean_q or len(clean_q) > 500:
        raise ValueError("问题不能为空且不能超过500个字符")

    yield "step", {"name": "问题理解", "status": "completed"}

    if _local_intent_answer(clean_q):
        result = await answer_question(clean_q, history, diagnosis_context)
        text = sanitize_text(result.get("answer", ""))
        result["answer"] = text
        for i in range(0, len(text), 12):
            yield "token", {"delta": text[i : i + 12]}
            await asyncio.sleep(0.008)
        yield "complete", result
        return

    predicted = [
        str(item.get("code"))
        for item in (diagnosis_context or {}).get("probabilities", [])[:3]
        if isinstance(item, dict) and item.get("code")
    ]
    documents = retrieve_knowledge(predicted, clean_q, top_k=10)
    yield "step", {"name": "知识检索", "status": "completed" if documents else "no_evidence", "count": len(documents)}

    result = await answer_question(clean_q, history, diagnosis_context)
    result["answer"] = sanitize_text(result.get("answer", ""))
    qwen_status = "completed" if result.get("provider") == "qwen" else ("skipped" if result.get("failure_reason") == "qwen_not_configured" else "degraded")
    yield "step", {"name": "Qwen 生成", "status": qwen_status}

    text = result.get("answer", "")
    for i in range(0, len(text), 12):
        yield "token", {"delta": text[i : i + 12]}
        await asyncio.sleep(0.008)

    yield "step", {"name": "整理回答与来源", "status": "completed"}
    yield "complete", result
# ── Multi-role Qwen co-brain consultation ────────────────────────────────

_COBRAIN_ROLE_SPECS = [
    {
        "key": "radiology",
        "role": "影像科",
        "title": "病灶与热区",
        "instruction": "从影像表现、模型概率和注意力热区出发，指出最需要关注的征象；说明热区不等于临床病灶定位。",
    },
    {
        "key": "respiratory",
        "role": "呼吸科",
        "title": "临床与检查",
        "instruction": "结合症状、血常规/CRP、CT 与复查路径给出下一步检查建议；不要写具体处方、剂量或治疗指令。",
    },
    {
        "key": "gp",
        "role": "全科 / 健康管理",
        "title": "分级与转诊",
        "instruction": "给出风险分级、是否需要门诊/转诊、随访节奏和危险因素管理建议。",
    },
    {
        "key": "patient",
        "role": "患者 / 家属",
        "title": "下一步怎么做",
        "instruction": "用家属能听懂的话解释结果，列出 2–3 个要问医生的问题，并提示哪些症状需要尽快急诊。",
    },
]

_COBRAIN_CACHE: dict[str, dict[str, Any]] = {}


def _cobrain_top(context: dict[str, Any] | None) -> list[dict[str, Any]]:
    values = (context or {}).get("probabilities") or []
    rows = [
        {"code": str(item.get("code") or ""), "name": str(item.get("name") or ""), "prob": float(item.get("prob") or 0)}
        for item in values
        if isinstance(item, dict)
    ]
    rows.sort(key=lambda item: item["prob"], reverse=True)
    return rows


def _cobrain_risk(context: dict[str, Any] | None) -> str:
    context = context or {}
    return str(context.get("risk_label") or context.get("risk") or "需关注")


def _cobrain_evidence(context: dict[str, Any] | None, focus: str) -> tuple[str, list[dict[str, Any]]]:
    top = _cobrain_top(context)
    codes = [item["code"] for item in top[:3] if item["code"]]
    documents = retrieve_knowledge(codes, focus or "影像表现 随访 会诊", top_k=10)
    text = "\n".join(
        f"[{item['id']}] {item['title']}：{item['content']}（来源：{item['source']}）" for item in documents
    ) or "无匹配知识片段"
    return text, documents


def _cobrain_facts(context: dict[str, Any] | None) -> str:
    context = context or {}
    top = _cobrain_top(context)
    probs = "，".join(f"{item['name']} {item['prob']:.1f}%" for item in top[:4]) or "未提供概率"
    summary = str(context.get("summary") or context.get("patient_summary") or "未提供摘要")
    attention = str(context.get("attention_region") or "未提供热区描述")
    member = _format_member_profile(context)
    return (
        f"风险：{_cobrain_risk(context)}；成员：{member}。\n"
        f"模型概率：{probs}。\n影像摘要：{summary}\n关注区域：{attention}"
    )


def _local_cobrain_role(spec: dict[str, str], context: dict[str, Any] | None) -> dict[str, str]:
    top = _cobrain_top(context)
    name = top[0]["name"] if top else "当前征象"
    prob = f"{top[0]['prob']:.1f}%" if top else "—"
    risk = _cobrain_risk(context)
    attention = str((context or {}).get("attention_region") or "右下肺野内中带")
    takes = {
        "radiology": f"{name} {prob}，热区位于{attention}；影像表现与模型关注区域基本一致，但热区不是临床病灶定位。",
        "respiratory": "若伴发热、咳嗽，先查血常规与 CRP；感染指标升高时先抗感染，4–6 周复查；持续不吸收再考虑胸部 CT。",
        "gp": f"综合风险为{risk}；有吸烟史、慢病或症状加重者优先门诊；低风险也需按体检周期随访。",
        "patient": "这不是确诊。带原始影像看呼吸科，问医生：是否需要 CT、多久复查、出现哪些症状要急诊。",
    }
    return {**spec, "take": takes.get(spec["key"], ""), "status": "local_fallback"}


def _cobrain_local_result(context: dict[str, Any] | None, focus: str) -> dict[str, Any]:
    roles = [_local_cobrain_role(spec, context) for spec in _COBRAIN_ROLE_SPECS]
    top = _cobrain_top(context)
    name = top[0]["name"] if top else "当前征象"
    documents = _cobrain_evidence(context, focus)[1]
    return {
        "provider": "local_fallback",
        "roles": roles,
        "consensus": f"四方共识：{name}是需要临床结合的高风险提示，不是诊断。建议带片至呼吸科 / 胸外科门诊，结合症状与化验决定是否 CT；4–6 周复查，症状加重随时急诊。",
        "divergence": "呼吸科倾向结合感染指标先治疗后复查；影像科更关注热区与影像变化。两者都认为需要临床门诊，而不是仅凭 AI 结果下结论。",
        "sources": [
            {key: item[key] for key in ("id", "title", "source", "source_url")}
            for item in documents[:3]
        ],
    }


def _build_cobrain_prompt(spec: dict[str, str], facts: str, evidence: str) -> str:
    return f"""你是 ChestX-AI 多角色会诊中的「{spec['role']}」，职责是「{spec['title']}」。
请基于下面的病例信息与本地知识片段，给出你的角色意见。

【病例事实】
{facts}

【可引用知识片段】
{evidence}

【你的职责】
{spec['instruction']}

【统一要求】
1. 约 80–130 个中文字符，直接说结论和下一步建议。
2. 不得声称确诊或排除疾病，不得给出处方、剂量或自行用药建议。
3. 不得改变模型概率；热区不等于临床病灶定位。
4. 只输出发言正文，不要角色名、标题、JSON 或 Markdown。
5. 不要重复免责声明，系统会统一展示。"""


def _clean_cobrain_text(text: Any) -> str:
    value = re.sub(r"\s+", " ", str(text or "")).strip()
    value = re.sub(r"^(影像科|呼吸科|全科|患者)[^：:]{0,10}[：:]\s*", "", value)
    value = sanitize_text(value)
    if len(value) > 260:
        value = value[:260].rstrip("，。；; ") + "。"
    return value


async def _qwen_cobrain_role(
    client: DashScopeQwenClient,
    spec: dict[str, str],
    context: dict[str, Any] | None,
    facts: str,
    evidence: str,
) -> dict[str, str]:
    fallback = _local_cobrain_role(spec, context)
    try:
        raw = await asyncio.wait_for(
            client.generate_chat(_build_cobrain_prompt(spec, facts, evidence), max_tokens=320),
            timeout=32,
        )
        text = _clean_cobrain_text(raw)
        if not text:
            raise ValueError("empty role answer")
        return {**spec, "take": text, "status": "qwen"}
    except Exception:
        return {**fallback, "status": "local_fallback"}


async def answer_cobrain(diagnosis_context: dict[str, Any] | None = None, focus: str = "") -> dict[str, Any]:
    """Four Qwen roles read the same case in parallel, with a safe local fallback."""
    context = diagnosis_context if isinstance(diagnosis_context, dict) else {}
    cache_key = json.dumps(
        {
            "case": str(context.get("case_id") or ""),
            "risk": _cobrain_risk(context),
            "probs": [f"{item['code']}:{item['prob']:.1f}" for item in _cobrain_top(context)[:5]],
            "member": ((context.get("member_profile") or {}) if isinstance(context.get("member_profile"), dict) else {}).get("name", ""),
            "focus": str(focus or ""),
        },
        ensure_ascii=False,
        sort_keys=True,
    )
    cached = _COBRAIN_CACHE.get(cache_key)
    if cached:
        return cached

    facts = _cobrain_facts(context)
    evidence, documents = _cobrain_evidence(context, focus)
    client = DashScopeQwenClient()
    if not client.enabled():
        result = _cobrain_local_result(context, focus)
        _COBRAIN_CACHE[cache_key] = result
        return result

    roles = await asyncio.gather(
        *[_qwen_cobrain_role(client, spec, context, facts, evidence) for spec in _COBRAIN_ROLE_SPECS]
    )
    provider = "qwen" if any(item.get("status") == "qwen" for item in roles) else "local_fallback"
    top = _cobrain_top(context)
    name = top[0]["name"] if top else "当前征象"
    result = {
        "provider": provider,
        "roles": roles,
        "consensus": f"四方共识：{name}是需要临床结合的高风险提示，不是诊断。建议带片至呼吸科 / 胸外科门诊，结合症状与化验决定是否 CT；4–6 周复查，症状加重随时急诊。",
        "divergence": "呼吸科倾向结合感染指标先治疗后复查；影像科更关注热区与影像变化。两者都认为需要临床门诊，而不是仅凭 AI 结果下结论。",
        "sources": [
            {key: item[key] for key in ("id", "title", "source", "source_url")}
            for item in documents[:3]
        ],
    }
    _COBRAIN_CACHE[cache_key] = result
    if len(_COBRAIN_CACHE) > 12:
        _COBRAIN_CACHE.pop(next(iter(_COBRAIN_CACHE)))
    return result
