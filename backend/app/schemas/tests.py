from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class TestQuestionDraft(BaseModel):
    __test__ = False

    model_config = ConfigDict(extra="forbid")

    question_id: int = Field(gt=0)
    display_order: int = Field(ge=0)
    marks: Decimal = Field(gt=0, max_digits=8, decimal_places=3)
    negative_marks: Decimal = Field(default=Decimal("0"), ge=0, max_digits=8, decimal_places=3)


class TestSectionDraft(BaseModel):
    __test__ = False

    model_config = ConfigDict(extra="forbid")

    code: str = Field(min_length=1, max_length=80)
    title: str = Field(min_length=1, max_length=160)
    display_order: int = Field(ge=0)
    questions: list[TestQuestionDraft] = Field(min_length=1, max_length=500)

    @field_validator("code", "title")
    @classmethod
    def trim_section_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Section code and title must be non-empty.")
        return value

    @model_validator(mode="after")
    def validate_questions(self):
        if len({question.question_id for question in self.questions}) != len(self.questions):
            raise ValueError("Question IDs must be unique within a section.")
        if len({question.display_order for question in self.questions}) != len(self.questions):
            raise ValueError("Question display order must be unique within a section.")
        return self


class CreateTestDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=240)
    kind: Literal["full_length", "section", "subject", "custom", "pyq", "daily"]
    visibility: Literal["public", "private"] = "public"
    examination_code: str = Field(min_length=1, max_length=80)

    @model_validator(mode="after")
    def trim_text(self):
        self.title = self.title.strip()
        self.examination_code = self.examination_code.strip()
        if not self.title or not self.examination_code:
            raise ValueError("Title and examination code must be non-empty.")
        return self


class CreateTestVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    duration_seconds: int = Field(gt=0, le=24 * 60 * 60)
    attempt_limit: int = Field(default=1, ge=1, le=100)
    available_from: datetime | None = None
    available_until: datetime | None = None
    shuffle_questions: bool = False
    shuffle_options: bool = False
    sections: list[TestSectionDraft] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_version(self):
        for field_name in ("available_from", "available_until"):
            value = getattr(self, field_name)
            if value is not None and value.utcoffset() is None:
                raise ValueError(f"{field_name} must include a timezone.")
        if self.available_from and self.available_until and self.available_until <= self.available_from:
            raise ValueError("available_until must be later than available_from")
        if len({section.code for section in self.sections}) != len(self.sections):
            raise ValueError("Section codes must be unique.")
        if len({section.display_order for section in self.sections}) != len(self.sections):
            raise ValueError("Section display order must be unique.")
        question_ids = [q.question_id for section in self.sections for q in section.questions]
        if len(question_ids) != len(set(question_ids)):
            raise ValueError("Question IDs must be unique across the test version.")
        return self


class SaveAnswerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    selected_option_id: str | None
    expected_version: int = Field(ge=0)


class SaveAnswerResponse(BaseModel):
    attempt_question_id: str
    selected_option_id: str | None
    version: int = Field(ge=1)
    saved_at: datetime


class SaveNavigationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_attempt_question_id: str = Field(min_length=1, max_length=128)
    marked_for_review: bool


class SubmitAttemptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: Literal["student_submitted"] = "student_submitted"


class SessionOption(BaseModel):
    id: str
    content: Any


class SessionAnswer(BaseModel):
    selected_option_id: str | None
    version: int = Field(ge=0)
    saved_at: datetime | None = None


class SessionQuestionState(BaseModel):
    visited: bool
    marked_for_review: bool


class SessionQuestion(BaseModel):
    attempt_question_id: str
    question_id: int
    section_id: str
    section_title: str
    display_order: int
    question: str
    options: list[SessionOption]
    answer: SessionAnswer
    state: SessionQuestionState


class TestSession(BaseModel):
    attempt_id: str
    test_id: str
    test_version_id: str
    test_title: str = "Timed practice"
    status: Literal["in_progress", "submitted", "expired", "terminated"]
    started_at: datetime
    deadline_at: datetime
    server_time: datetime
    remaining_seconds: int = Field(ge=0)
    questions: list[SessionQuestion]


class PublicTestSummary(BaseModel):
    id: str
    title: str
    kind: Literal["full_length", "section", "subject", "custom", "pyq", "daily"]
    examination_code: str
    duration_seconds: int = Field(gt=0)
    question_count: int = Field(ge=1)
    available_from: datetime | None = None
    available_until: datetime | None = None
    attempts_used: int = Field(ge=0)
    attempt_limit: int = Field(ge=1)
    active_attempt_id: str | None = None


class PublicTestListResponse(BaseModel):
    items: list[PublicTestSummary]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=50)
    total: int = Field(ge=0)
    has_more: bool


class AttemptSubmissionResponse(BaseModel):
    attempt_id: str
    status: Literal["submitted", "expired"]
    submission_reason: Literal["student_submitted", "timer_expired"]
    submitted_at: datetime


class TestDraftResponse(BaseModel):
    id: str
    title: str
    status: Literal["draft"]


class TestVersionResponse(BaseModel):
    id: str
    test_id: str
    version_number: int = Field(gt=0)
    question_count: int = Field(ge=1)
    status: Literal["draft"]


class TestPublishResponse(BaseModel):
    id: str
    test_id: str
    version_number: int = Field(gt=0)
    status: Literal["published"]
    published_at: datetime
