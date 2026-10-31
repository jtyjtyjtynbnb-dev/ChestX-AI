"""Evidence-grounded report generation and local fallback behavior."""

import asyncio
import json

from .config import DISCLAIMER
from .qwen_client import DashScopeQwenClient, parse_report_content
from .safety import SAFE_SUFFIX, has_unsafe_clinical_language, sanitize_report, sanitize_text


DISEASE_CN = {
    "no_finding": "未见异常",
    "atelectasis": "肺不张",
    "cardiomegaly": "心脏扩大",
    "effusion": "胸腔积液",
    "infiltration": "浸润影",
    "mass": "肿块",
    "nodule": "结节",
    "pneumonia": "肺炎",
    "pneumothorax": "气胸",
    "consolidation": "肺实变",
}


def _display_name(item: dict) -> str:
    code = str(item.get("code") or "")
    return DISEASE_CN.get(code, str(item.get("name") or code or "未知类别"))

REQUIRED_REPORT_FIELDS = {
    "summary",
    "findings",
    "impression",
    "evidence",
    "limitations",
    "suggested_actions",
    "disclaimer",
}


def _risk_context(inference: dict) -> dict:
    top = inference.get("top_prediction") or {}
    code = str(top.get("code") or "")
    probability = float(top.get("prob") or 0)
    if code == "no_finding":
        level, explanation = "低风险正常", "模型最高关注类别为 No Finding，未提示需要优先关注的 10 类征象。"
    elif probability >= 60:
        level, explanation = "高风险关注", f"模型最高关注类别概率为 {probability:.1f}%，达到演示用高风险阈值（≥60%）。"
    elif probability >= 25:
        level, explanation = "中风险随访", f"模型最高关注类别概率为 {probability:.1f}%，处于演示用中风险阈值（25%–60%）。"
    else:
        level, explanation = "低风险正常", f"模型最高关注类别概率为 {probability:.1f}%，低于演示用中风险阈值（<25%）。"
    return {
        "level": level,
        "explanation": explanation + " 分级依据是最高类别概率，仅供健康科普展示，不是临床风险分层；最终判断需结合医生对影像、病史和检查的综合评估。",
    }


def _top_findings(inference: dict, limit: int = 3) -> list[dict]:
    return [
        {
            "code": item.get("code"),
            "name": item.get("name"),
            "probability": float(item.get("prob") or 0),
        }
        for item in inference.get("probabilities", [])[:limit]
    ]


def _plain_finding_hint(code: str) -> str:
    if code in {"nodule", "mass"}:
        return "如果影像上存在结节或占位，医生通常会结合大小、边缘、密度和既往片判断是否需要进一步胸部 CT。"
    if code == "effusion":
        return "医生可能会结合胸部超声确认积液及其位置，并进一步寻找心、肺、感染或其他原因。"
    if code == "pneumothorax":
        return "气胸属于需要及时评估的情况；如突发胸痛、明显呼吸困难或症状加重，应尽快就医。"
    if code in {"pneumonia", "consolidation", "infiltration"}:
        return "这类密度增高影可能与感染、炎症、水肿或其他原因有关，需要结合发热、咳嗽、血常规和听诊等临床信息判断。"
    if code == "cardiomegaly":
        return "心影增大可能受投照体位和吸气程度影响，医生通常会结合血压、心电图或超声心动图进一步评估。"
    if code == "atelectasis":
        return "肺不张可能与分泌物堵塞、压迫或术后状态有关，通常需要结合病史和进一步影像检查判断原因。"
    return "这只代表模型对影像特征的关注程度，不能据此确定具体疾病。"


def _tailored_actions(inference: dict) -> list[str]:
    top = inference.get("top_prediction") or {}
    code = str(top.get("code") or "")
    name = _display_name(top)
    actions = [
        f"建议携带原始胸片、既往片和正式影像报告，到呼吸科或影像科当面复核「{name}」相关表现。",
    ]
    if code in {"nodule", "mass"}:
        actions.append("请医生结合病灶大小、边缘、密度和时间变化，判断是否需要胸部 CT 或缩短随访间隔。")
    elif code == "effusion":
        actions.append("医生可能安排胸部超声或 CT 进一步确认积液量、位置和可能原因。")
    elif code == "pneumothorax":
        actions.append("如出现突发胸痛、呼吸困难、口唇发紫或症状快速加重，请立即急诊，不要等待模型结果。")
    elif code in {"pneumonia", "consolidation", "infiltration"}:
        actions.append("就诊时请说明发热、咳嗽、咳痰、胸痛等症状及持续时间，医生会结合血常规、炎症指标和查体判断。")
    elif code == "cardiomegaly":
        actions.append("建议同时告知医生血压、心悸、气促、下肢水肿等情况，医生可能安排心电图或超声心动图。")
    elif code == "no_finding":
        actions.append("模型未提示高概率异常，但仍建议按体检计划随访；如有持续咳嗽、胸痛或气促，仍需就医。")
    actions.append("请勿自行购药或用药；所有检查和治疗决定由医生结合完整临床资料作出。")
    return actions


def _patient_summary(inference: dict) -> str:
    top = inference.get("top_prediction") or {}
    findings = _top_findings(inference, 3)
    top_name = top.get("name") or "未知类别"
    probability = float(top.get("prob") or 0)
    hint = _plain_finding_hint(str(top.get("code") or ""))
    others = "、".join(f"{_display_name(item)}（{item['probability']:.1f}%）" for item in findings[1:3])
    return (
        f"这次 AI 模型把「{_display_name(top)}」列为最高关注，概率约 {probability:.1f}%；"
        f"{'其次为 ' + others + '。' if others else ''}"
        f"概率只表示模型对影像特征的关注程度，不等于医生的最终判断，也不能排除其他问题。"
        f"{hint}建议带着原始影像和既往片找呼吸科或影像科医生复核，医生可能会安排 CT、超声或其他检查；"
        "如出现胸痛、呼吸困难、咯血或症状加重，请及时就医。"
    )


def _doctor_summary(inference: dict) -> str:
    top = inference.get("top_prediction") or {}
    findings = _top_findings(inference, 3)
    top_name = top.get("name") or "未知类别"
    probability = float(top.get("prob") or 0)
    top_text = "；".join(f"{_display_name(item)}（{item['name']}）{item['probability']:.1f}%" for item in findings)
    return (
        f"10 类胸片模型输出 Top3 为：{top_text}。最高关注类别为「{_display_name(top)}」（{top_name}，{probability:.1f}%），"
        f"按演示阈值归为{_risk_context(inference)['level']}。"
        "影像学复核建议重点关注肺野密度与分布、病灶边缘/形态、肺门与纵隔轮廓、心影大小、肋膈角及投照体位/吸气因素；"
        "模型为报告级弱标签训练，存在标签噪声和类别不平衡，不能据此作出影像诊断。"
        "建议结合原始影像、既往片、症状体征和正式影像报告综合判断；结节/占位可考虑薄层 CT，积液可结合超声，"
        "气胸或急性症状需优先急诊评估。"
    )



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
    risk = _risk_context(inference)
    return f"""请根据结构化影像模型结果、用户问题和医学知识片段生成健康科普报告（不提供原始影像）。
用户问题：
{user_question or '用户未补充问题'}

影像模型结果：
{json.dumps(model_findings, ensure_ascii=False)}

演示风险分级：
{risk['level']}（{risk['explanation']}）

可引用知识片段：
{evidence}

只返回合法 JSON，不要 Markdown，不要代码块。格式必须包括：
{{
  "summary": "不超过120字的摘要",
  "patient_summary": "面向患者/家属，180–260字：先说明模型关注与概率，再解释不是确诊，最后给2–3条可执行建议；语言通俗，不制造恐慌",
  "doctor_summary": "面向医生，220–320字：使用规范影像描述（肺野/肺门/心影/纵隔/肋膈角/密度/边缘/分布等），列出Top3概率、需重点复核的征象和下一步检查或随访建议；不得写确诊结论",
  "findings": [{{"code": "疾病代码", "name": "疾病名称", "probability": 0.0, "explanation": "解释模型结果"}}],
  "impression": ["2–3条描述性影像学印象，不得写确诊"],
  "risk_explanation": "80–120字：结合风险等级和最高概率解释分级依据，并说明不是临床风险分层",
  "evidence": [{{"chunk_id": "知识片段ID", "claim": "该片段支持的说法"}}],
  "limitations": ["3–4条影像、标签或模型局限性"],
  "suggested_actions": ["4–6条具体建议，结合最高关注类别；包含复查/进一步检查/就医时机的适量建议"],
  "follow_up_questions": ["患者可以继续追问的3个具体问题"],
  "disclaimer": "{DISCLAIMER}"
}}

硬性要求：只能引用提供的知识片段；不得编造来源；不得使用“确诊”“患有”“诊断为”“排除疾病”“一定是”等绝对结论；统一使用“影像提示/可能性/建议就医进一步检查”的话术；证据不足时明确说明；保留模型概率原值；风险等级是演示用阈值，不得写成临床风险分层；医生版可以更专业，但只能描述影像表现和可能性，不能给出治疗处方。"""


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
    # Backward-compatible fields: older Qwen responses may not include these.
    if not isinstance(report.get("patient_summary"), str) or not report["patient_summary"].strip():
        report["patient_summary"] = report["summary"]
    if not isinstance(report.get("doctor_summary"), str) or not report["doctor_summary"].strip():
        report["doctor_summary"] = report["summary"]
    if not isinstance(report.get("risk_explanation"), str) or not report["risk_explanation"].strip():
        report["risk_explanation"] = _risk_context(inference)["explanation"]
    if len(report["patient_summary"]) < 120:
        report["patient_summary"] = (report["patient_summary"].rstrip("。") + "。" + _patient_summary(inference))
    if len(report["doctor_summary"]) < 180:
        report["doctor_summary"] = (report["doctor_summary"].rstrip("。") + "。" + _doctor_summary(inference))
    if len(report["risk_explanation"]) < 60:
        report["risk_explanation"] = (report["risk_explanation"].rstrip("。") + "。" + _risk_context(inference)["explanation"])
    if not isinstance(report.get("follow_up_questions"), list):
        report["follow_up_questions"] = []
    report["follow_up_questions"] = [
        str(item) for item in report["follow_up_questions"][:3] if str(item).strip()
    ] or [
        "这个概率高吗？需要进一步做什么检查？",
        "这个征象在胸片上通常意味着什么？",
        "我就诊时需要带哪些资料？",
    ]
    report = sanitize_report(report)
    report["disclaimer"] = DISCLAIMER
    if has_unsafe_clinical_language(report):
        raise ValueError("Qwen report contains unsafe or diagnostic language")
    actions = report.get("suggested_actions")
    if isinstance(actions, list):
        for item in _tailored_actions(inference):
            if item not in actions:
                actions.append(item)
        if not any("进一步检查" in str(item) for item in actions):
            actions.append("建议携带影像到正规医疗机构呼吸科或影像科进一步检查。")
    return report


def build_local_fallback(inference: dict, documents: list[dict]) -> dict:
    top = inference.get("top_prediction") or {}
    risk = _risk_context(inference)
    top_name = top.get("name", "未知")
    probability = float(top.get("prob") or 0)
    findings = _top_findings(inference, 3)
    fallback = {
        "summary": (
            f"模型当前最高关注类别为 {_display_name(top)}（{top_name}），概率 {probability:.1f}%。"
            f"演示分级为{risk['level']}；该结果仅为影像提示，不能用于临床诊断，也不能替代医生面诊。"
        ),
        "patient_summary": _patient_summary(inference),
        "doctor_summary": _doctor_summary(inference),
        "risk_explanation": risk["explanation"],
        "follow_up_questions": [
            "这个概率高吗？需要进一步做什么检查？",
            "这个征象在胸片上通常意味着什么？",
            "我就诊时需要带哪些资料？",
        ],
        "findings": [
            {
                "code": item.get("code"),
                "name": item.get("name"),
                "probability": item.get("prob"),
                "explanation": _plain_finding_hint(str(item.get("code") or "")),
            }
            for item in inference.get("probabilities", [])[:3]
        ],
        "impression": [
            f"模型输出提示「{_display_name(top)}」方向需要关注，概率为 {probability:.1f}%；该结果仅代表模型关注度，不等同于影像诊断。",
            "建议结合原始影像的肺野密度、病灶边缘、肺门/纵隔、心影和肋膈角等结构由医生复核，并参考既往片和体位/吸气条件。",
        ],
        "evidence": [
            {"chunk_id": item["id"], "claim": item["content"]}
            for item in documents[:3]
        ],
        "limitations": [
            "本地兜底报告基于结构化概率和知识库生成，未调用 Qwen。",
            "模型使用报告级弱标签训练，存在标签噪声、类别不平衡和设备/体位差异。",
            "模型只能提示影像关注方向，不能确诊、不能排除其他疾病，也不能替代医生面诊。",
        ],
        "suggested_actions": _tailored_actions(inference),
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
        # 即使 Qwen 网络悬挂，40 秒后也回退本地报告，避免前端等到超时。
        content = await asyncio.wait_for(
            client.generate_chat(build_report_prompt(user_question, inference, documents), max_tokens=2200),
            timeout=45,
        )
        report = parse_report_content(content)
        return validate_report(report, inference, documents), "qwen"
    except Exception:
        return build_local_fallback(inference, documents), "local_fallback"

