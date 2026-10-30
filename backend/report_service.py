"""Evidence-grounded report generation and local fallback behavior."""

import json

from .config import DISCLAIMER
from .qwen_client import DashScopeQwenClient, parse_report_content
from .safety import SAFE_SUFFIX, has_unsafe_clinical_language, sanitize_report, sanitize_text


REQUIRED_REPORT_FIELDS = {
    "summary",
    "findings",
    "impression",
    "evidence",
    "limitations",
    "suggested_actions",
    "disclaimer",
}


def build_report_prompt(
    user_question: str,
    inference: dict,
    documents: list[dict],
) -> str:
    model_findings = [
        {
            "code": item.get("code"),
            "name": item.get("name"),
            "probability": item.get("prob"),
        }
        for item in inference.get("probabilities", [])[:5]
    ]
    evidence = "\n\n".join(
        f"[{item['id']}] {item['title']}\n{item['content']}\n"
        f"来源：{item['source']} ({item['source_url']})"
        for item in documents
    )
    return f"""请根据结构化影像模型结果、用户问题和医学知识片段生成健康科普报告（不提供原始影像）。

用户问题：
{user_question or '用户未补充问题'}

影像模型结果：
{json.dumps(model_findings, ensure_ascii=False)}

可引用知识片段：
{evidence}

只返回合法 JSON，不要 Markdown，不要代码块。格式必须包括：
{{
  "summary": "不超过120字的摘要",
  "findings": [{{"code": "疾病代码", "name": "疾病名称", "probability": 0.0, "explanation": "解释模型结果"}}],
  "impression": ["影像学印象，须为描述性、非诊断性表述"],
  "evidence": [{{"chunk_id": "知识片段ID", "claim": "该片段支持的说法"}}],
  "limitations": ["影像或模型局限性"],
  "suggested_actions": ["适合的下一步建议"],
  "disclaimer": "{DISCLAIMER}"
}}

硬性要求：只能引用提供的知识片段；不得编造来源；不得使用“确诊”“患有”“诊断为”“排除疾病”“一定是”等绝对结论；统一使用“影像提示/可能性/建议就医进一步检查”的话术；证据不足时明确说明；保留模型概率原值。"""


def validate_report(
    report: dict,
    inference: dict,
    documents: list[dict],
) -> dict:
    if not REQUIRED_REPORT_FIELDS.issubset(report):
        raise ValueError("Qwen report is missing required fields")
    if not isinstance(report.get("summary"), str):
        raise ValueError("Qwen report summary must be text")
    for field in ("findings", "impression", "evidence", "limitations", "suggested_actions"):
        if not isinstance(report.get(field), list):
            raise ValueError(f"Qwen report {field} must be a list")
    if not all(isinstance(item, dict) for item in report["evidence"]):
        raise ValueError("Qwen report evidence must contain objects")

    valid_ids = {item["id"] for item in documents}
    model_findings = []
    for item in inference.get("probabilities", [])[:5]:
        model_findings.append(
            {
                "code": item.get("code"),
                "name": item.get("name"),
                "probability": item.get("prob"),
                "explanation": "模型输出提示该类别需关注，不能据此作出临床诊断。",
            }
        )
    report["findings"] = model_findings
    report["evidence"] = [
        item for item in report.get("evidence", [])
        if item.get("chunk_id") in valid_ids
    ]
    report = sanitize_report(report)
    report["disclaimer"] = DISCLAIMER
    if has_unsafe_clinical_language(report):
        raise ValueError("Qwen report contains unsafe or diagnostic language")
    actions = report.get("suggested_actions")
    if isinstance(actions, list) and not any("进一步检查" in str(item) for item in actions):
        actions.append("建议携带影像到正规医疗机构呼吸科或影像科进一步检查。")
    return report


def build_local_fallback(inference: dict, documents: list[dict]) -> dict:
    top = inference.get("top_prediction") or {}
    fallback = {
        "summary": (
            f"模型当前最高关注类别为 {top.get('name', '未知')}，"
            f"概率 {top.get('prob', 0):.1f}%。该结果仅为影像提示，不能用于临床诊断，也不能替代医生面诊。"
        ),
        "findings": [
            {
                "code": item.get("code"),
                "name": item.get("name"),
                "probability": item.get("prob"),
                "explanation": "来自本地影像模型的概率输出，不代表临床诊断。",
            }
            for item in inference.get("probabilities", [])[:3]
        ],
        "impression": [
            f"模型输出提示 {top.get('name', '未知')} 方向需关注；影像学印象需由医生结合临床判断。"
        ],
        "evidence": [
            {"chunk_id": item["id"], "claim": item["content"]}
            for item in documents[:3]
        ],
        "limitations": ["大模型报告服务暂不可用，当前显示本地模型和知识库摘要。"],
        "suggested_actions": [
            "建议携带影像到正规医疗机构呼吸科或影像科进一步检查。",
            "如有持续或加重症状，请及时就医；请勿自行购药或用药，遵医嘱处理。",
        ],
        "disclaimer": DISCLAIMER,
    }
    fallback = sanitize_report(fallback)
    fallback["suggested_actions"].append(SAFE_SUFFIX)
    return fallback


async def create_report(
    user_question: str,
    inference: dict,
    documents: list[dict],
) -> tuple[dict, str]:
    """生成报告；只传文本/概率，不把原始影像发送到云端。"""
    client = DashScopeQwenClient()
    if not client.enabled():
        return build_local_fallback(inference, documents), "local_fallback"

    try:
        # 隐私优先：不把原始影像发送到云端。Qwen 只接收结构化概率、问题和知识片段。
        report = parse_report_content(
            await client.generate_chat(build_report_prompt(user_question, inference, documents), max_tokens=1600)
        )
        return validate_report(report, inference, documents), "qwen"
    except Exception:
        return build_local_fallback(inference, documents), "local_fallback"

