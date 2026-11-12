"""Small tool registry shared by the Agent, the HTTP API and the MCP stdio server.

The registry is intentionally local and explicit: no arbitrary code execution.
Every tool has an OpenAI-compatible function schema and a bounded implementation.
"""

from __future__ import annotations

from typing import Any

from .rag.retriever import retrieve_knowledge
from .safety import sanitize_text


TOOL_SPECS = [
    {
        "name": "knowledge_search",
        "description": "检索本地 200 条胸片科普知识，返回 Top10 来源和证据片段。",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "用户问题或影像描述"},
                "predicted_codes": {"type": "array", "items": {"type": "string"}, "description": "模型 Top3 类别代码"},
                "top_k": {"type": "integer", "minimum": 1, "maximum": 12, "default": 10},
            },
            "required": ["query"],
        },
    },
    {
        "name": "record_lookup",
        "description": "读取当前病例/成员档案摘要，用于随访对比和风险变化说明。",
        "parameters": {
            "type": "object",
            "properties": {"member_id": {"type": "string"}, "question": {"type": "string"}},
            "required": [],
        },
    },
    {
        "name": "report_outline",
        "description": "把模型 Top3、风险和证据整理成患者版/医生版报告大纲。",
        "parameters": {
            "type": "object",
            "properties": {"predicted_codes": {"type": "array", "items": {"type": "string"}}},
            "required": ["predicted_codes"],
        },
    },
    {
        "name": "safety_review",
        "description": "对拟输出文本做医疗安全审查，过滤确诊、患有、诊断为等绝对表述。",
        "parameters": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
]


def tool_schemas() -> list[dict[str, Any]]:
    return TOOL_SPECS


def plan_tools(question: str, predicted_codes: list[str] | None = None, has_record: bool = False) -> list[dict[str, Any]]:
    """Deterministic tool planner, used as a transparent Function-Calling layer."""
    q = (question or "").lower()
    plan = [{"name": "safety_review", "reason": "所有输出都必须经过安全审查"}]
    if q or predicted_codes:
        plan.insert(0, {"name": "knowledge_search", "reason": "问题或模型类别需要循证证据"})
    if predicted_codes:
        plan.append({"name": "report_outline", "reason": "需要把概率整理成报告结构"})
    if has_record or any(word in q for word in ("档案", "随访", "历史", "变化", "对比")):
        plan.insert(1, {"name": "record_lookup", "reason": "问题涉及成员档案/随访"})
    return plan


def invoke_tool(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
    args = arguments or {}
    if name == "knowledge_search":
        query = str(args.get("query") or "")
        codes = [str(x) for x in (args.get("predicted_codes") or [])]
        top_k = max(1, min(12, int(args.get("top_k") or 10)))
        return {"tool": name, "documents": retrieve_knowledge(codes, query, top_k=top_k)}
    if name == "record_lookup":
        return {
            "tool": name,
            "member_id": str(args.get("member_id") or ""),
            "note": "档案由前端 SQLite/localStorage 持有；此工具只返回当前上下文摘要，不读取真实影像。",
        }
    if name == "report_outline":
        codes = [str(x) for x in (args.get("predicted_codes") or [])]
        return {
            "tool": name,
            "outline": [
                {"section": "患者版", "points": ["影像提示", "下一步", "何时就医"]},
                {"section": "医生版", "points": ["Top3 概率", "影像描述", "影像印象", "建议与局限"]},
            ],
            "codes": codes,
        }
    if name == "safety_review":
        text = str(args.get("text") or "")
        safe = sanitize_text(text)
        return {"tool": name, "safe": safe, "changed": safe != text}
    return {"tool": name, "error": "unknown_tool"}
