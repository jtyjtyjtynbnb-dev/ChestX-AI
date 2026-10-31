"""Explicit request contracts for the public FastAPI endpoints."""

import re
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


_CONTROL_OR_HTML = re.compile(r"[\x00-\x1f<>]")


class MemberProfilePayload(BaseModel):
    name: str = Field(min_length=1, max_length=20)
    age: str | int | None = None
    gender: str = Field(default="未填写", max_length=10)
    age_group: str = Field(default="", max_length=20)
    conditions: str = Field(default="", max_length=120)
    notes: str = Field(default="", max_length=240)
    model_config = {"extra": "allow"}

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value or _CONTROL_OR_HTML.search(value):
            raise ValueError("name must be non-empty and must not contain control/HTML characters")
        return value

    @field_validator("age")
    @classmethod
    def validate_age(cls, value: str | int | None) -> str:
        if value is None or value == "":
            return ""
        try:
            age = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("age must be an integer between 0 and 120") from exc
        if age < 0 or age > 120:
            raise ValueError("age must be between 0 and 120")
        return str(age)

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, value: str) -> str:
        value = (value or "未填写").strip()
        if value not in {"男", "女", "未填写", ""}:
            raise ValueError("gender must be 男/女/未填写")
        return value or "未填写"

    @field_validator("conditions", "notes")
    @classmethod
    def validate_text_fields(cls, value: str) -> str:
        value = (value or "").strip()
        if _CONTROL_OR_HTML.search(value):
            raise ValueError("text fields must not contain control/HTML characters")
        return value


class FamilyMemberPayload(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    profile: MemberProfilePayload
    records: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    model_config = {"extra": "allow"}


class MembersSyncRequest(BaseModel):
    members: list[FamilyMemberPayload] = Field(default_factory=list, max_length=50)
    current_member_id: str | None = Field(default=None, max_length=100)


class ConversationsSyncRequest(BaseModel):
    conversations: list[dict[str, Any]] = Field(default_factory=list, max_length=50)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    history: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    diagnosis_context: dict[str, Any] | None = None

    @field_validator("question")
    @classmethod
    def question_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("question must not be blank")
        return value


class NoteSummaryRequest(BaseModel):
    text: str = Field(min_length=10, max_length=4000)

    @field_validator("text")
    @classmethod
    def text_must_not_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("text must not be blank")
        return value


class QwenSettingsRequest(BaseModel):
    api_key: str = Field(default="", max_length=500)
    model: Literal["qwen3.8-flash", "qwen3.8-max"] = "qwen3.8-flash"
    persist: bool = True
