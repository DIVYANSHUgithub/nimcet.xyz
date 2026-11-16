from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class ContentBlock(StrictModel):
    type: Literal['text', 'latex', 'image']
    text: str = Field(default='', max_length=20000)
    media_id: UUID | None = None
    alt: str = Field(default='', max_length=500)

    @model_validator(mode='after')
    def validate_block(self):
        if self.type == 'image':
            if self.media_id is None or not self.alt or self.text:
                raise ValueError('Images need a media reference and alternative text.')
        elif not self.text or self.media_id is not None:
            raise ValueError('Text and LaTeX blocks need text and cannot reference media.')
        return self


class RichOption(StrictModel):
    id: UUID
    blocks: list[ContentBlock] = Field(min_length=1, max_length=30)


class Occurrence(StrictModel):
    exam: str = Field(min_length=1, max_length=80)
    year: int = Field(ge=1900, le=2200)
    section: str = Field(min_length=1, max_length=120)
    position: int = Field(ge=1, le=1000)
    source: str = Field(min_length=1, max_length=1000)


class QuestionDocument(StrictModel):
    schema_version: Literal[1] = 1
    statement: list[ContentBlock] = Field(min_length=1, max_length=60)
    options: list[RichOption] = Field(min_length=4, max_length=4)
    correct_option_id: UUID
    explanation: list[ContentBlock] = Field(default_factory=list, max_length=60)
    occurrences: list[Occurrence] = Field(default_factory=list, max_length=100)

    @model_validator(mode='after')
    def stable_options(self):
        ids = [o.id for o in self.options]
        if len(set(ids)) != 4 or self.correct_option_id not in ids:
            raise ValueError('Four unique stable option IDs and a matching answer are required.')
        occurrences = [(o.exam, o.year, o.section, o.position) for o in self.occurrences]
        if len(set(occurrences)) != len(occurrences):
            raise ValueError('Duplicate PYQ occurrence.')
        return self


class QuestionWrite(StrictModel):
    exam: str = Field(min_length=1, max_length=80)
    exam_year: int = Field(ge=1900, le=2200)
    section: str = Field(min_length=1, max_length=120)
    question_number: int = Field(ge=1, le=10000)
    subject: str = Field(min_length=1, max_length=120)
    topic: str = Field(min_length=1, max_length=120)
    subtopic_id: UUID | None = None
    difficulty: Literal['easy', 'medium', 'hard']
    source: str = Field(default='', max_length=1000)
    state: Literal['draft', 'review', 'published', 'archived'] = 'draft'
    expected_revision: int = Field(default=0, ge=0)
    document: QuestionDocument

    @model_validator(mode='after')
    def publication(self):
        if self.state == 'published' and (not self.document.explanation or self.subtopic_id is None):
            raise ValueError('Publishing requires an explanation and a catalog subtopic.')
        return self


class CatalogWrite(StrictModel):
    code: str = Field(min_length=1, max_length=80, pattern=r'^[A-Za-z0-9_-]+$')
    name: str = Field(min_length=1, max_length=120)
    parent_id: UUID | None = None
    status: Literal['active', 'inactive'] = 'active'


class PracticeAnswer(StrictModel):
    option_id: str = Field(min_length=1, max_length=80)
    expected_revision: int | None = Field(default=None, ge=0)
