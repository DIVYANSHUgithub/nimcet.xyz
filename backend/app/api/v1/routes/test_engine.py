from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response

from app.api.dependencies import get_current_principal, get_optional_principal
from app.api.v1.routes.content import read_registered_media
from app.db.database import DatabaseUnavailable
from app.db.test_engine import AttemptNotFound, TestEngineRepository
from app.domain.test_engine import TestEngineConflict, TestEngineForbidden
from app.schemas.tests import (
    AttemptResultResponse,
    AttemptReviewResponse,
    AttemptSubmissionResponse,
    PublicTestListResponse,
    SaveAnswerRequest,
    SaveAnswerResponse,
    SaveNavigationRequest,
    StudentAnalyticsResponse,
    StudentAttemptHistoryResponse,
    TestSession,
    SubmitAttemptRequest,
)


tests_router = APIRouter()
attempts_router = APIRouter()
student_analytics_router = APIRouter()


def _repository(request: Request) -> TestEngineRepository:
    return request.app.state.test_engine_repository


def _database_unavailable() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail={"code": "database_unavailable", "message": "The test service is temporarily unavailable."},
    )


def _handle_domain_error(exc: Exception) -> HTTPException:
    if isinstance(exc, DatabaseUnavailable):
        return _database_unavailable()
    if isinstance(exc, AttemptNotFound):
        return HTTPException(
            status_code=404,
            detail={"code": "attempt_not_found", "message": "The attempt was not found."},
        )
    if isinstance(exc, TestEngineForbidden):
        if exc.code == "test_unavailable":
            return HTTPException(
                status_code=404,
                detail={"code": "test_not_found", "message": "The test was not found."},
            )
        return HTTPException(
            status_code=403,
            detail={"code": exc.code, "message": "This test operation is not permitted."},
        )
    if isinstance(exc, TestEngineConflict):
        return HTTPException(
            status_code=409,
            detail={"code": exc.code, "message": "The attempt changed or is no longer active."},
        )
    if isinstance(exc, ValueError) and str(exc) == "invalid_option":
        return HTTPException(
            status_code=422,
            detail={"code": "invalid_option", "message": "The selected option is not part of this question."},
        )
    raise exc


@tests_router.get("", response_model=PublicTestListResponse)
def list_public_tests(
    request: Request,
    response: Response,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    principal=Depends(get_optional_principal),
) -> PublicTestListResponse:
    response.headers['Cache-Control'] = 'private, no-store'
    try:
        payload = _repository(request).list_public_tests(
            user_id=principal.user_id if principal else None, page=page, page_size=page_size
        )
    except DatabaseUnavailable as exc:
        raise _handle_domain_error(exc) from None
    return PublicTestListResponse.model_validate(payload)


@tests_router.post("/{test_id}/attempts", response_model=TestSession, status_code=201)
def start_attempt(
    test_id: str,
    request: Request,
    principal=Depends(get_current_principal),
) -> TestSession:
    try:
        payload = _repository(request).start_attempt(test_id=test_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return TestSession.model_validate(payload)


@attempts_router.get("/{attempt_id}", response_model=TestSession)
def get_attempt(
    attempt_id: str,
    request: Request,
    principal=Depends(get_current_principal),
) -> TestSession:
    try:
        payload = _repository(request).get_attempt(attempt_id=attempt_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return TestSession.model_validate(payload)


@attempts_router.get("/{attempt_id}/result", response_model=AttemptResultResponse)
def get_attempt_result(
    attempt_id: str,
    request: Request,
    principal=Depends(get_current_principal),
) -> AttemptResultResponse:
    try:
        payload = _repository(request).get_attempt_result(attempt_id=attempt_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return AttemptResultResponse.model_validate(payload)


@attempts_router.get("/{attempt_id}/review", response_model=AttemptReviewResponse)
def get_attempt_review(
    attempt_id: str,
    request: Request,
    principal=Depends(get_current_principal),
) -> AttemptReviewResponse:
    try:
        payload = _repository(request).get_attempt_review(attempt_id=attempt_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return AttemptReviewResponse.model_validate(payload)


@attempts_router.get("/{attempt_id}/media/{media_id}")
def attempt_media(
    attempt_id: str,
    media_id: UUID,
    request: Request,
    review: bool = False,
    principal=Depends(get_current_principal),
):
    repo = _repository(request)
    load = repo.get_attempt_review if review else repo.get_attempt
    try:
        payload = load(attempt_id=attempt_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict) as exc:
        raise _handle_domain_error(exc) from None
    target = str(media_id)
    for question in payload['questions']:
        groups = [question.get('statement_blocks', [])]
        if review:
            groups.append(question.get('explanation_blocks', []))
        for option in question['options']:
            if isinstance(option['content'], dict):
                groups.append(option['content'].get('blocks', []))
        if any(
            isinstance(block, dict) and block.get('type') == 'image' and block.get('media_id') == target
            for blocks in groups if isinstance(blocks, list)
            for block in blocks
        ):
            return read_registered_media(media_id, request)
    raise HTTPException(404)


@attempts_router.put("/{attempt_id}/answers/{attempt_question_id}", response_model=SaveAnswerResponse)
def save_answer(
    attempt_id: str,
    attempt_question_id: str,
    payload: SaveAnswerRequest,
    request: Request,
    principal=Depends(get_current_principal),
) -> SaveAnswerResponse:
    try:
        result = _repository(request).save_answer(
            attempt_id=attempt_id,
            attempt_question_id=attempt_question_id,
            user_id=principal.user_id,
            selected_option_id=payload.selected_option_id,
            expected_version=payload.expected_version,
        )
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return SaveAnswerResponse.model_validate(result)


@attempts_router.put("/{attempt_id}/navigation")
def save_navigation(
    attempt_id: str,
    payload: SaveNavigationRequest,
    request: Request,
    principal=Depends(get_current_principal),
) -> dict:
    try:
        return _repository(request).save_navigation(
            attempt_id=attempt_id,
            user_id=principal.user_id,
            current_attempt_question_id=payload.current_attempt_question_id,
            marked_for_review=payload.marked_for_review,
        )
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict, ValueError) as exc:
        raise _handle_domain_error(exc) from None


@attempts_router.post("/{attempt_id}/submit", response_model=AttemptSubmissionResponse)
def submit_attempt(
    attempt_id: str,
    _payload: SubmitAttemptRequest,
    request: Request,
    principal=Depends(get_current_principal),
) -> AttemptSubmissionResponse:
    try:
        result = _repository(request).submit_attempt(attempt_id=attempt_id, user_id=principal.user_id)
    except (DatabaseUnavailable, AttemptNotFound, TestEngineForbidden, TestEngineConflict, ValueError) as exc:
        raise _handle_domain_error(exc) from None
    return AttemptSubmissionResponse.model_validate(result)


@student_analytics_router.get("/me/attempts", response_model=StudentAttemptHistoryResponse)
def list_my_attempts(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    principal=Depends(get_current_principal),
) -> StudentAttemptHistoryResponse:
    try:
        payload = _repository(request).list_student_attempts(
            user_id=principal.user_id, page=page, page_size=page_size
        )
    except DatabaseUnavailable as exc:
        raise _handle_domain_error(exc) from None
    return StudentAttemptHistoryResponse.model_validate(payload)


@student_analytics_router.get("/me/dashboard", response_model=StudentAnalyticsResponse)
def my_test_analytics(
    request: Request,
    principal=Depends(get_current_principal),
) -> StudentAnalyticsResponse:
    try:
        payload = _repository(request).get_student_analytics(user_id=principal.user_id)
    except DatabaseUnavailable as exc:
        raise _handle_domain_error(exc) from None
    return StudentAnalyticsResponse.model_validate(payload)
