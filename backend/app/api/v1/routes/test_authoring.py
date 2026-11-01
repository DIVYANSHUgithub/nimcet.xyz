from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.dependencies import require_roles
from app.core.security import Principal
from app.db.database import DatabaseUnavailable
from app.db.test_authoring import TestAuthoringRepository
from app.domain.test_engine import TestEngineForbidden
from app.schemas.tests import (
    CreateTestDraft,
    CreateTestVersion,
    TestDraftResponse,
    TestPublishResponse,
    TestVersionResponse,
)


router = APIRouter()
EDITOR_ROLES = ("editor", "administrator", "super_administrator")
ADMIN_ROLES = ("administrator", "super_administrator")


def _repository(request: Request) -> TestAuthoringRepository:
    return TestAuthoringRepository(request.app.state.database)


def _translate(exc: Exception) -> HTTPException:
    if isinstance(exc, DatabaseUnavailable):
        return HTTPException(
            status_code=503,
            detail={"code": "database_unavailable", "message": "Test authoring is temporarily unavailable."},
        )
    if isinstance(exc, TestEngineForbidden):
        status = 404 if exc.code in {"test_unavailable", "test_version_unavailable"} else 409
        return HTTPException(
            status_code=status,
            detail={"code": exc.code, "message": "The test cannot be changed in its current state."},
        )
    if isinstance(exc, ValueError):
        return HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "The test configuration is invalid."},
        )
    raise exc


@router.post("/tests", response_model=TestDraftResponse, status_code=201)
def create_test(
    payload: CreateTestDraft,
    request: Request,
    principal: Principal = Depends(require_roles(*EDITOR_ROLES)),
) -> TestDraftResponse:
    try:
        result = _repository(request).create_draft(
            actor_id=principal.user_id,
            draft=payload,
            request_id=request.state.request_id,
        )
    except (DatabaseUnavailable, TestEngineForbidden, ValueError) as exc:
        raise _translate(exc) from None
    return TestDraftResponse.model_validate(result)


@router.post("/tests/{test_id}/versions", response_model=TestVersionResponse, status_code=201)
def create_test_version(
    test_id: str,
    payload: CreateTestVersion,
    request: Request,
    principal: Principal = Depends(require_roles(*EDITOR_ROLES)),
) -> TestVersionResponse:
    try:
        result = _repository(request).create_version(
            actor_id=principal.user_id,
            test_id=test_id,
            version=payload,
            request_id=request.state.request_id,
        )
    except (DatabaseUnavailable, TestEngineForbidden, ValueError) as exc:
        raise _translate(exc) from None
    return TestVersionResponse.model_validate(result)


@router.post(
    "/tests/{test_id}/versions/{version_id}/publish",
    response_model=TestPublishResponse,
)
def publish_test_version(
    test_id: str,
    version_id: str,
    request: Request,
    principal: Principal = Depends(require_roles(*ADMIN_ROLES)),
) -> TestPublishResponse:
    try:
        result = _repository(request).publish_version(
            actor_id=principal.user_id,
            test_id=test_id,
            version_id=version_id,
            request_id=request.state.request_id,
        )
    except (DatabaseUnavailable, TestEngineForbidden, ValueError) as exc:
        raise _translate(exc) from None
    return TestPublishResponse.model_validate(result)
