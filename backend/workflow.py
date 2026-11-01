"""Observable LangGraph Agent workflow for chest X-ray education reports."""

from __future__ import annotations

import asyncio
import time
import uuid
from collections.abc import AsyncIterator, Callable
from typing import Any, TypedDict

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:  # pragma: no cover - lightweight fallback when langgraph is not installed
    START = "__start__"
    END = "__end__"

    class _CompiledFallbackGraph:
        def __init__(self, nodes, edges, conditional_edges):
            self._nodes = nodes
            self._edges = edges
            self._conditional_edges = conditional_edges

        async def astream(self, initial_state: dict, stream_mode: str = "updates"):
            state = dict(initial_state)
            curr = self._edges.get(START)
            while curr and curr != END:
                fn = self._nodes[curr]
                update = await fn(state)
                state = {**state, **update}
                yield {curr: update}
                if curr in self._conditional_edges:
                    router, mapping = self._conditional_edges[curr]
                    curr = mapping.get(router(state), END)
                else:
                    curr = self._edges.get(curr, END)

    class StateGraph:  # type: ignore[no-redef]
        def __init__(self, _state_type):
            self._nodes = {}
            self._edges = {}
            self._conditional_edges = {}

        def add_node(self, name: str, fn: Callable):
            self._nodes[name] = fn

        def add_edge(self, src: str, dst: str):
            self._edges[src] = dst

        def add_conditional_edges(self, src: str, router: Callable, mapping: dict):
            self._conditional_edges[src] = (router, mapping)

        def compile(self):
            return _CompiledFallbackGraph(self._nodes, self._edges, self._conditional_edges)

from PIL import Image

from .rag.retriever import hybrid_retrieve
from .report_service import build_local_fallback, create_report


class AgentState(TypedDict, total=False):
    trace_id: str
    image: Image.Image
    question: str
    infer: Callable[[Image.Image], dict]
    inference: dict
    sources: list[dict]
    retrieval_info: dict
    report: dict
    provider: str
    fallback_reason: str | None
    steps: list[dict]


def build_agent_graph():
    # 节点 1：输入校验。只做边界检查，不在这里调用模型，便于快速失败。
    async def validate(state: AgentState) -> dict[str, Any]:
        if len(state.get("question", "")) > 500:
            raise ValueError("问题长度不能超过500个字符")
        if not isinstance(state.get("image"), Image.Image):
            raise ValueError("胸片输入无效")
        return {"trace_id": uuid.uuid4().hex[:12], "steps": [{"name": "输入校验", "status": "completed", "elapsed_ms": 0}]}

    # 节点 2：本地 ONNX 推理。推理放入线程池，避免阻塞 FastAPI 事件循环。
    async def image_inference(state: AgentState) -> dict[str, Any]:
        started = time.perf_counter()
        result = await asyncio.to_thread(state["infer"], state["image"])
        step = {"name": "影像推理", "status": "completed", "elapsed_ms": round((time.perf_counter() - started) * 1000, 1)}
        return {"inference": result, "steps": [*state.get("steps", []), step]}

    # 节点 3：混合检索。用模型 top-3 类别 + 用户问题召回本地知识片段。
    async def retrieve(state: AgentState) -> dict[str, Any]:
        started = time.perf_counter()
        codes = [item["code"] for item in state["inference"].get("all_predictions", [])[:3]]
        sources, info = await hybrid_retrieve(codes, state.get("question", ""), top_k=4)
        step = {"name": "知识检索", "status": "completed", "elapsed_ms": round((time.perf_counter() - started) * 1000, 1), "count": len(sources), "mode": info["mode"]}
        return {"sources": sources, "retrieval_info": info, "steps": [*state.get("steps", []), step]}

    # 条件路由：没有证据时不调用大模型，直接走本地模板，防止凭空编造。
    def evidence_route(state: AgentState) -> str:
        return "fallback" if not state.get("sources") else "report"

    # 节点 4：可选 Qwen 循证报告；只发送结构化概率与知识片段，不上传原始影像。
    async def report(state: AgentState) -> dict[str, Any]:
        started = time.perf_counter()
        result, provider = await create_report(state.get("question", ""), state["inference"], state["sources"])
        step = {"name": "DashScope Qwen 循证报告", "status": "completed" if provider == "qwen" else "degraded", "elapsed_ms": round((time.perf_counter() - started) * 1000, 1)}
        return {"report": result, "provider": provider, "fallback_reason": None if provider == "qwen" else "qwen_unavailable", "steps": [*state.get("steps", []), step]}

    # 节点 5：证据不足兜底，仍使用统一的安全话术。
    async def fallback(state: AgentState) -> dict[str, Any]:
        steps = [*state.get("steps", []), {"name": "证据充分性检查", "status": "degraded", "elapsed_ms": 0}]
        steps.append({"name": "报告生成", "status": "degraded", "elapsed_ms": 0})
        return {"report": build_local_fallback(state["inference"], []), "provider": "local_fallback", "fallback_reason": "insufficient_evidence", "steps": steps}

    # 节点 6：证据一致性检查。只读取 report_service 已算好的 groundedness，
    # 不额外调用大模型，避免为了“多一个节点”增加延迟。
    async def grounding_check(state: AgentState) -> dict[str, Any]:
        grounded = state.get("report", {}).get("groundedness") or {}
        status = grounded.get("status", "no_evidence")
        step = {
            "name": "证据一致性",
            "status": "completed" if status in {"strong", "partial"} else "degraded",
            "elapsed_ms": 0,
        }
        return {"steps": [*state.get("steps", []), step]}

    # 节点 7：安全审查/收尾；报告字段已在 report_service 内做证据 ID 校验和话术清洗。
    async def safety(state: AgentState) -> dict[str, Any]:
        step = {"name": "安全审查", "status": "completed", "elapsed_ms": 0}
        return {"steps": [*state.get("steps", []), step]}

    graph = StateGraph(AgentState)
    graph.add_node("input_validation", validate)
    graph.add_node("image_inference", image_inference)
    graph.add_node("hybrid_retrieval", retrieve)
    graph.add_node("report_generation", report)
    graph.add_node("insufficient_evidence", fallback)
    graph.add_node("grounding_check", grounding_check)
    graph.add_node("safety_review", safety)
    graph.add_edge(START, "input_validation")
    graph.add_edge("input_validation", "image_inference")
    graph.add_edge("image_inference", "hybrid_retrieval")
    graph.add_conditional_edges("hybrid_retrieval", evidence_route, {"report": "report_generation", "fallback": "insufficient_evidence"})
    graph.add_edge("report_generation", "grounding_check")
    graph.add_edge("insufficient_evidence", "grounding_check")
    graph.add_edge("grounding_check", "safety_review")
    graph.add_edge("safety_review", END)
    return graph.compile()


AGENT_GRAPH = build_agent_graph()


async def workflow_events(image: Image.Image, question: str, infer: Callable[[Image.Image], dict]) -> AsyncIterator[tuple[str, dict]]:
    initial: AgentState = {"image": image, "question": question, "infer": infer, "steps": []}
    state: AgentState = initial
    emitted_count = 0
    async for update in AGENT_GRAPH.astream(initial, stream_mode="updates"):
        values = next(iter(update.values()))
        state = {**state, **values}
        steps = state.get("steps", [])
        for step in steps[emitted_count:]:
            yield "step", step
        emitted_count = len(steps)
    yield "complete", {
        "trace_id": state["trace_id"],
        "inference": state["inference"],
        "report": state["report"],
        "sources": state.get("sources", []),
        "retrieval": state.get("retrieval_info", {}),
        "provider": state["provider"],
        "fallback_reason": state.get("fallback_reason"),
        "steps": state["steps"],
    }
