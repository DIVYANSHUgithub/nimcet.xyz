from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class QuestionItem(BaseModel):
    """Legacy practice-question projection; answer fields are practice-only."""

    model_config = ConfigDict(from_attributes=True)

    id: int | str
    exam: str | None = None
    exam_year: int | None = None
    section: str | None = None
    question_number: int | None = None
    question: str | None = None
    options: list[Any] | None = None
    correct_option: int | None = None
    explanation: str | None = None
    subject: str | None = None
    topic: str | None = None
    difficulty: str | None = None
    source: str | None = None
    status: str
    created_at: datetime | str | None = None


class QuestionPage(BaseModel):
    items: list[QuestionItem]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    has_more: bool


class QuestionFacet(BaseModel):
    id: str
    name: str


class QuestionFacets(BaseModel):
    subjects: list[QuestionFacet]
    topics: list[str]
