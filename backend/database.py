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
    try:
        DB_DIR.chmod(0o777)
    except OSError:
        pass
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
                days_ago INTEGER DEFAULT 0,
                risk_level TEXT NOT NULL,
                image_url TEXT DEFAULT '',
                summary TEXT DEFAULT '',
                attention_region TEXT DEFAULT '',
                probabilities_json TEXT NOT NULL,
                report_json TEXT DEFAULT '{}',
                heatmap_data TEXT DEFAULT '',
                is_demo INTEGER DEFAULT 0,
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
        # Lightweight migration for packages created before demo tagging existed.
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(diagnosis_records)")}
        if "is_demo" not in columns:
            conn.execute("ALTER TABLE diagnosis_records ADD COLUMN is_demo INTEGER DEFAULT 0")
        if "heatmap_data" not in columns:
            conn.execute("ALTER TABLE diagnosis_records ADD COLUMN heatmap_data TEXT DEFAULT ''")
        # Seed records created by older demo packages should keep their demo badge.
        conn.execute(
            "UPDATE diagnosis_records SET is_demo = 1 WHERE id IN (?, ?, ?)",
            ("REC-20261017-01", "REC-20261011-02", "REC-20260922-03"),
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
            "daysAgo": r["days_ago"],
            "riskLevel": r["risk_level"],
            "imageUrl": r["image_url"],
            "summary": r["summary"],
            "attentionRegion": r["attention_region"],
            "probabilities": json.loads(r["probabilities_json"] or "[]"),
            "report": json.loads(r["report_json"] or "{}"),
            "heatmapDataUrl": r["heatmap_data"] or "",
            "isDemo": bool(r["is_demo"]),
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
        if not members:
            return get_all_members_with_records()
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
                        id, member_id, case_code, title, date_str, days_ago, risk_level,
                        image_url, summary, attention_region, probabilities_json, report_json, heatmap_data, is_demo, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rid,
                        mid,
                        str(rec.get("code") or ""),
                        str(rec.get("title") or "胸部正位 X 光筛查"),
                        str(rec.get("date") or ""),
                        int(rec.get("daysAgo") or 0),
                        str(rec.get("riskLevel") or "LOW"),
                        str(rec.get("imageUrl") or ""),
                        str(rec.get("summary") or ""),
                        str(rec.get("attentionRegion") or ""),
                        json.dumps(rec.get("probabilities") or [], ensure_ascii=False),
                        json.dumps(rec.get("report") or {}, ensure_ascii=False),
                        str(rec.get("heatmapDataUrl") or "")[:2_000_000],
                        1 if (rec.get("isDemo") or rec.get("is_demo")) else 0,
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
