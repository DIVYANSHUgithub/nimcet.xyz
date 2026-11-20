from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request

from app.db.database import DatabaseUnavailable
from app.db.questions import QuestionsRepository
from app.domain.question_content import option_ids, statement_blocks, statement_text
from app.schemas.questions import PYQQuestionFacets, QuestionFacet, QuestionFacets, QuestionItem, QuestionPage

router = APIRouter()


def public_item(item):
    item = dict(item)
    doc = item.get('content_document')
    if doc:
        item['statement_blocks'] = doc['statement']
        item['option_ids'] = [o['id'] for o in doc['options']]
        item['options'] = [{'id':o['id'],'blocks':o['blocks']} for o in doc['options']]
    else:
        item['statement_blocks'] = statement_blocks(item.get('question'))
        item['option_ids'] = option_ids(item.get('options'))
    item['question'] = statement_text(item.get('question'), item['statement_blocks'])
    # Response model deliberately has no answer/explanation/document fields.
    return QuestionItem.model_validate(item)



def _repository(request: Request) -> QuestionsRepository:
    return QuestionsRepository(request.app.state.database, rich_content=True) if request.app.state.settings.question_authoring_enabled else QuestionsRepository(request.app.state.database)


def _database_unavailable() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={
            "code": "database_unavailable",
            "message": "The question bank is temporarily unavailable.",
        },
    )


@router.get("/facets", response_model=QuestionFacets)
def question_facets(request: Request) -> QuestionFacets:
    try:
        subjects, topics = _repository(request).facets()
    except DatabaseUnavailable:
        raise _database_unavailable() from None
    return QuestionFacets(
        subjects=[QuestionFacet(id=value, name=value) for value in subjects],
        topics=topics,
    )


@router.get('/pyq-facets', response_model=PYQQuestionFacets)
def pyq_question_facets(request: Request):
    try:
        return _repository(request).pyq_facets()
    except DatabaseUnavailable:
        raise _database_unavailable() from None


@router.get("", response_model=QuestionPage)
def list_questions(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    exam: str | None = Query(default=None, min_length=1, max_length=80),
    section: str | None = Query(default=None, min_length=1, max_length=120),
    subject: str | None = Query(default=None, min_length=1, max_length=120),
    chapter: str | None = Query(default=None, min_length=1, max_length=120),
    topic: str | None = Query(default=None, max_length=120),
    difficulty: str | None = Query(default=None, min_length=1, max_length=40),
    year: int | None = Query(default=None, ge=1900, le=2200),
    question_type: Literal["MCQ", "Unspecified"] | None = Query(default=None, alias="type"),
    search: str | None = Query(default=None, max_length=120),
    subtopic_id: UUID | None = None,
    pyq: bool = False,
    sort: Literal["question-number", "recent"] = Query(default="question-number"),
) -> QuestionPage:
    filters = {
        "exam": exam,
        "section": section,
        "subject": None if subject == "all" else subject,
        "topic": topic,
        "difficulty": difficulty,
        "year": year,
        "question_type": question_type,
        "search": search,
    }
    if subtopic_id is not None:
        filters['subtopic_id'] = subtopic_id
    if chapter is not None:
        filters['chapter'] = chapter
    if pyq:
        filters['pyq'] = True
    try:
        items, total, actual_page = _repository(request).list_page(
            page=page,
            page_size=page_size,
            filters=filters,
            sort=sort,
        )
    except DatabaseUnavailable:
        raise _database_unavailable() from None

    return QuestionPage(
        items=[public_item(item) for item in items],
        page=actual_page,
        page_size=page_size,
        total=total,
        has_more=actual_page * page_size < total,
    )


@router.get("/{question_id}", response_model=QuestionItem)
def get_question(question_id: str, request: Request) -> QuestionItem:
    if not question_id.strip() or len(question_id) > 128:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "The question ID is invalid."},
        )
    try:
        item = _repository(request).get_published(question_id)
    except DatabaseUnavailable:
        raise _database_unavailable() from None
    if item is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "question_not_found", "message": "The published question was not found."},
        )
    return public_item(item)
