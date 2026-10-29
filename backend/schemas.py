"""Explicit request contracts for the public FastAPI endpoints."""

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class MembersSyncRequest(BaseModel):
    members: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
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


class QwenSettingsRequest(BaseModel):
    api_key: str = Field(default="", max_length=500)
    model: Literal["qwen3.8-flash", "qwen3.8-max"] = "qwen3.8-flash"
    persist: bool = True
