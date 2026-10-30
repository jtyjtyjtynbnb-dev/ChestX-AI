"""Small source-backed retriever for the bundled medical knowledge base."""

import json
import math
import re
from functools import lru_cache
from pathlib import Path
from collections import Counter
import numpy as np


KNOWLEDGE_PATH = Path(__file__).with_name("knowledge.json")


@lru_cache(maxsize=1)
def load_knowledge() -> list[dict]:
    """加载本地知识库；不访问网络，保证离线可检索。"""
    return json.loads(KNOWLEDGE_PATH.read_text(encoding="utf-8"))


def _terms(value: str) -> set[str]:
    """中文按字/双字切分，英文按词切分，用于 BM25 词项匹配。"""
    value = value.lower()
    terms = set(re.findall(r"[a-z0-9]+", value))
    chinese = "".join(re.findall(r"[\u4e00-\u9fff]", value))
    terms.update(chinese[i : i + 2] for i in range(max(0, len(chinese) - 1)))
    return {term for term in terms if term}


def _tokens(value: str) -> list[str]:
    value = value.lower()
    tokens = re.findall(r"[a-z0-9]+", value)
    chinese = "".join(re.findall(r"[\u4e00-\u9fff]", value))
    tokens.extend(chinese[i : i + 2] for i in range(max(0, len(chinese) - 1)))
    tokens.extend(chinese)
    return tokens


def _score(item: dict, query_terms: set[str], predicted_codes: set[str]) -> int:
    searchable = " ".join(
        [item["title"], item["content"], *item.get("keywords", [])]
    )
    document_terms = _terms(searchable)
    score = len(query_terms & document_terms)
    if item["disease"] in predicted_codes:
        score += 5
    return score


def _bm25_scores(corpus: list[str], query_terms: set[str]) -> list[float]:
    """轻量 BM25：不引入额外依赖，适合内置小知识库。"""
    tokenized = [_tokens(text) for text in corpus]
    n = len(tokenized)
    average_length = sum(map(len, tokenized)) / max(n, 1)
    document_frequency = Counter(term for tokens in tokenized for term in set(tokens))
    scores = []
    for tokens in tokenized:
        counts = Counter(tokens)
        score = 0.0
        for term in query_terms:
            frequency = counts[term]
            if not frequency:
                continue
            inverse = math.log(1 + (n - document_frequency[term] + 0.5) / (document_frequency[term] + 0.5))
            denominator = frequency + 1.5 * (1 - 0.75 + 0.75 * len(tokens) / max(average_length, 1))
            score += inverse * frequency * 2.5 / denominator
        scores.append(score)
    return scores


def _tfidf_vectors(corpus: list[str], query: str) -> tuple[list[list[float]], list[float]]:
    documents = [_terms(text) for text in corpus]
    vocabulary = sorted(set().union(*documents))
    if not vocabulary:
        return [[0.0] for _ in corpus], [0.0] * len(corpus)
    n = len(documents)
    idf = {term: math.log(1 + (n + 1) / (sum(term in doc for doc in documents) + 1)) for term in vocabulary}
    vectors = []
    for terms in documents:
        counts = Counter(terms)
        vector = [counts[term] * idf[term] for term in vocabulary]
        norm = math.sqrt(sum(value * value for value in vector)) or 1
        vectors.append([value / norm for value in vector])
    query_terms = _terms(query)
    query_vector = [float(term in query_terms) * idf[term] for term in vocabulary]
    query_norm = math.sqrt(sum(value * value for value in query_vector)) or 1
    query_vector = [value / query_norm for value in query_vector]
    similarities = [sum(a * b for a, b in zip(vector, query_vector)) for vector in vectors]
    return vectors, similarities


# 本地同步检索入口：类别过滤 + 文本相关性，供聊天和报告兜底使用。
def retrieve_knowledge(
    predicted_codes: list[str],
    query: str = "",
    top_k: int = 4,
) -> list[dict]:
    """Return ranked evidence chunks with their source metadata."""
    if not predicted_codes and not query.strip():
        return []
    predicted = set(predicted_codes)
    query_terms = _terms(query)
    candidates = load_knowledge()
    corpus = [" ".join([i["title"], i["content"], *i.get("keywords", [])]) for i in candidates]
    bm25 = _bm25_scores(corpus, query_terms)
    _, vector_scores = _tfidf_vectors(corpus, query)
    if not predicted and max(bm25, default=0) < 0.5 and max(vector_scores, default=0) < 0.18:
        return []
    bm25_max = max(bm25, default=0) or 1
    ranks_bm25 = sorted(range(len(candidates)), key=lambda i: bm25[i], reverse=True)
    ranks_vector = sorted(range(len(candidates)), key=lambda i: vector_scores[i], reverse=True)
    bm25_rank = {index: rank for rank, index in enumerate(ranks_bm25)}
    vector_rank = {index: rank for rank, index in enumerate(ranks_vector)}
    ranked_indices = sorted(
        range(len(candidates)),
        key=lambda i: (
            (0.55 * bm25[i] / bm25_max)
            + 0.45 * vector_scores[i]
            + (0.08 if candidates[i]["disease"] in predicted else 0)
        ),
        reverse=True,
    )
    results = []
    for index in ranked_indices:
        item = candidates[index]
        score = (0.55 * bm25[index] / bm25_max) + 0.45 * vector_scores[index]
        if score < 0.08 and item["disease"] not in predicted:
            continue
        results.append({
            **item,
            "retrieval": {
                "bm25": round(bm25[index], 5),
                "vector": round(vector_scores[index], 5),
                "rrf_rank": round(1 / (60 + bm25_rank[index]) + 1 / (60 + vector_rank[index]), 6),
                "mode": "local_tfidf",
            },
        })
    return results[: min(max(0, top_k), 8)]


# 异步混合检索入口：本地 BM25/TF-IDF 为基线，可选 DashScope embedding/rerank 增强。
async def hybrid_retrieve(
    predicted_codes: list[str],
    query: str,
    top_k: int = 4,
) -> tuple[list[dict], dict]:
    """Fuse local BM25/TF-IDF with optional DashScope embeddings and reranking."""
    local = retrieve_knowledge(predicted_codes, query, top_k=12)
    if not local:
        return [], {"mode": "no_evidence", "bm25": True, "vector": False, "reranker": False}

    from ..qwen_client import DashScopeError, DashScopeQwenClient

    client = DashScopeQwenClient()
    if not client.enabled():
        return local[:top_k], {"mode": "local_bm25_tfidf", "bm25": True, "vector": "local_tfidf", "reranker": False}

    try:
        texts = [query, *[f"{item['title']}\n{item['content']}" for item in local]]
        vectors = await client.embed(texts)
        query_vector = np.asarray(vectors[0], dtype=np.float32)
        document_vectors = np.asarray(vectors[1:], dtype=np.float32)
        norms = np.linalg.norm(document_vectors, axis=1) * max(float(np.linalg.norm(query_vector)), 1e-8)
        similarities = document_vectors @ query_vector / np.maximum(norms, 1e-8)
        for item, score in zip(local, similarities, strict=True):
            item["retrieval"]["vector"] = round(float(score), 6)

        reranked = await client.rerank(query, [f"{item['title']}\n{item['content']}" for item in local])
        rerank_order = {int(item["index"]): rank for rank, item in enumerate(reranked)}
        local_order = {item["id"]: rank for rank, item in enumerate(local)}
        local.sort(key=lambda item: (
            0.55 * (1 / (60 + local_order[item["id"]]))
            + 0.45 * (1 / (60 + rerank_order.get(local_order[item["id"]], len(local))))
        ), reverse=True)
        for rank, item in enumerate(local):
            item["retrieval"]["mode"] = "dashscope_embedding_bm25_rerank"
            item["retrieval"]["rerank_rank"] = rank + 1
        return local[:top_k], {"mode": "dashscope_embedding_bm25_rerank", "bm25": True, "vector": client.model, "reranker": True}
    except (DashScopeError, KeyError, ValueError, TypeError):
        return local[:top_k], {"mode": "local_bm25_tfidf", "bm25": True, "vector": "local_tfidf", "reranker": False, "degraded": True}

