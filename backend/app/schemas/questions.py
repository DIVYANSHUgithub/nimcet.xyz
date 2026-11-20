from datetime import datetime
from typing import Any
from uuid import UUID

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
    statement_blocks: list[Any] = Field(default_factory=list)
    option_ids: list[str] = Field(default_factory=list)
    revision: int = 0
    subject: str | None = None
    topic: str | None = None
    pyq_years: list[int] = Field(default_factory=list)
    pyq_topic: str | None = None
    pyq_chapter: str | None = None
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


class PYQTaxonomyItem(BaseModel):
    subject: str | None
    chapter: str | None
    topic_id: UUID | None
    topic: str | None


class PYQQuestionFacets(BaseModel):
    years: list[int]
    taxonomy: list[PYQTaxonomyItem]
