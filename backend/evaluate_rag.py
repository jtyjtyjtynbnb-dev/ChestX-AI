"""Small, reproducible retrieval benchmark for the bundled 200-entry knowledge base.

The labels are disease-level relevance labels, not clinical ground truth. Run
with CHESTX_DISABLE_DENSE=1 for the BM25/TF-IDF baseline, then without it for
the hybrid retriever.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from .rag.retriever import retrieve_knowledge

CASES = [
    {"q": "右下肺斑片状高密度影，可能是什么？", "disease": ["pneumonia", "infiltration"]},
    {"q": "胸腔积液在胸片上怎么观察？", "disease": ["effusion"]},
    {"q": "肋膈角变钝意味着什么？", "disease": ["effusion"]},
    {"q": "气胸线和外侧无肺纹理区是什么？", "disease": ["pneumothorax"]},
    {"q": "心影增大，心胸比怎么计算？", "disease": ["cardiomegaly"]},
    {"q": "肺结节随访需要做什么检查？", "disease": ["nodule"]},
    {"q": "磨玻璃影和肺结节有什么区别？", "disease": ["nodule", "infiltration"]},
    {"q": "肺不张有哪些间接征象？", "disease": ["atelectasis"]},
    {"q": "肺水肿的蝶翼征怎么理解？", "disease": ["edema", "infiltration"]},
    {"q": "肺部肿块边缘毛刺提示什么？", "disease": ["mass"]},
    {"q": "肺炎的支气管充气征是什么？", "disease": ["pneumonia"]},
    {"q": "胸膜增厚和肋膈角变钝怎么区分？", "disease": ["thickening", "effusion"]},
    {"q": "肺气肿的桶状胸表现是什么？", "disease": ["emphysema"]},
    {"q": "肺纤维化的蜂窝肺表现是什么？", "disease": ["fibrosis"]},
    {"q": "胸腔有水在胸片上是什么样？", "disease": ["effusion"]},
    {"q": "肺部有阴影，一般要考虑哪些方向？", "disease": ["infiltration", "pneumonia", "mass"]},
    {"q": "气胸急症为什么要尽快处理？", "disease": ["pneumothorax"]},
    {"q": "心衰引起的肺水肿怎么观察？", "disease": ["edema"]},
    {"q": "报告里的浸润影是什么意思？", "disease": ["infiltration"]},
    {"q": "胸腔积液和胸膜增厚怎么区分？", "disease": ["effusion", "thickening"]},
    {"q": "肺结节越大越危险吗？", "disease": ["nodule"]},
    {"q": "肺部实变和浸润影有什么区别？", "disease": ["consolidation", "infiltration"]},
    {"q": "气胸和肺大疱怎么区分？", "disease": ["pneumothorax", "emphysema"]},
    {"q": "心影增大需要做哪些检查？", "disease": ["cardiomegaly"]},
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("reports/rag_eval.json"))
    parser.add_argument("--top-k", type=int, default=10)
    args = parser.parse_args()
    mode = "bm25_tfidf" if os.environ.get("CHESTX_DISABLE_DENSE") == "1" else "bm25_tfidf_dense"
    rows = []
    recalls = []
    rrs = []
    for case in CASES:
        docs = retrieve_knowledge([], case["q"], top_k=args.top_k)
        relevant = [
            index for index, doc in enumerate(docs, 1)
            if doc.get("disease") in case["disease"]
        ]
        recall = 1.0 if relevant else 0.0
        rr = 1.0 / relevant[0] if relevant else 0.0
        recalls.append(recall)
        rrs.append(rr)
        rows.append({
            "query": case["q"],
            "expected": case["disease"],
            "hit": bool(relevant),
            "first_relevant_rank": relevant[0] if relevant else None,
            "top_ids": [doc["id"] for doc in docs],
        })
    result = {
        "mode": mode,
        "cases": len(CASES),
        "top_k": args.top_k,
        "recall_at_k": round(sum(recalls) / len(recalls), 4),
        "mrr": round(sum(rrs) / len(rrs), 4),
        "hits": sum(1 for row in rows if row["hit"]),
        "rows": rows,
        "note": "Disease-level relevance labels for retrieval regression; not clinical ground truth.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: result[key] for key in ("mode", "cases", "recall_at_k", "mrr", "hits")}, ensure_ascii=False))


if __name__ == "__main__":
    main()
