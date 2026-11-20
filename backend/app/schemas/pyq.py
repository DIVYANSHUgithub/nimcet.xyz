from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator, model_validator


VerificationState = Literal["unverified", "verified", "needs_review"]
PaperState = Literal["draft", "published", "archived"]
PYQMode = Literal["official_simulation", "practice"]


class PYQPaperMetadata(BaseModel):
    """Paper metadata only; this model does not imply source content is verified."""

    model_config = ConfigDict(extra="forbid")

    examination_code: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=1900, le=2200)
    original_title: str = Field(min_length=1, max_length=240)
    duration_seconds: int | None = Field(default=None, gt=0, le=24 * 60 * 60)
    source_url: HttpUrl | None = None
    source_citation: str | None = Field(default=None, max_length=1000)
    source_verification: VerificationState = "unverified"
    answer_key_verification: VerificationState = "unverified"
    state: PaperState = "draft"

    @field_validator("examination_code", "original_title")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must contain non-whitespace characters.")
        return value

    @field_validator("source_citation")
    @classmethod
    def trim_citation(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class PYQQuestionMapping(BaseModel):
    """Maps paper position to an existing central question; no question content is copied."""

    model_config = ConfigDict(extra="forbid")

    question_id: str = Field(min_length=1, max_length=128)
    original_section: str = Field(min_length=1, max_length=160)
    original_position: int = Field(gt=0, le=1000)
    original_question_number: int | None = Field(default=None, gt=0, le=1000)
    marks: Decimal = Field(ge=0, max_digits=8, decimal_places=3)
    negative_marks: Decimal = Field(default=Decimal("0"), ge=0, max_digits=8, decimal_places=3)
    verification: VerificationState = "unverified"

    @field_validator("question_id", "original_section")
    @classmethod
    def trim_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must contain non-whitespace characters.")
        return value


class PYQPublishRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    paper: PYQPaperMetadata
    questions: list[PYQQuestionMapping] = Field(min_length=1, max_length=1000)


class PYQModeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: PYQMode
    scored: bool = True
    shuffle_questions: bool = False
    shuffle_options: bool = False


class PaperMarkingGroup(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=160)
    question_count: int = Field(ge=1, le=1000)
    marks: Decimal = Field(gt=0, max_digits=8, decimal_places=3)
    negative_marks: Decimal = Field(ge=0, max_digits=8, decimal_places=3)


class PaperSectionBlueprint(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    code: str = Field(min_length=1,max_length=80)
    question_count: int = Field(ge=1,le=1000)
    duration_seconds: int | None = Field(default=None, gt=0, le=86400)
    marks: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=3)
    negative_marks: Decimal | None = Field(default=None, ge=0, max_digits=8, decimal_places=3)
    marking_groups: list[PaperMarkingGroup] = Field(default_factory=list, max_length=100)

    @model_validator(mode='after')
    def check_marking_scheme(self):
        if self.marking_groups:
            if self.marks is not None or self.negative_marks is not None:
                raise ValueError('Use either a uniform marking scheme or marking groups.')
            if sum(group.question_count for group in self.marking_groups) != self.question_count:
                raise ValueError('Marking groups must cover every question in the section.')
        elif self.marks is None or self.negative_marks is None:
            raise ValueError('Provide the marks and penalty for the section.')
        return self


class PYQApprovalRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    paper: PYQPaperMetadata
    sections: list[PaperSectionBlueprint] = Field(min_length=1,max_length=100)

    @model_validator(mode='after')
    def complete_blueprint(self):
        if len({s.code.casefold() for s in self.sections}) != len(self.sections):
            raise ValueError('Section codes must be unique.')
        if self.paper.duration_seconds is None or self.paper.source_verification!='verified' or self.paper.answer_key_verification!='verified':
            raise ValueError('A verified paper, verified answer key and duration are required.')
        if not self.paper.source_citation and self.paper.source_url is None:
            raise ValueError('Source provenance is required.')
        if self.paper.state != 'draft':
            raise ValueError('Only draft metadata can be approved.')
        durations = [section.duration_seconds for section in self.sections]
        if any(value is not None for value in durations) and (
            any(value is None for value in durations) or sum(value or 0 for value in durations) != self.paper.duration_seconds
        ):
            raise ValueError('Timed sections must add up to the paper duration.')
        return self
