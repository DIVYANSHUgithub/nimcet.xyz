from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.api.dependencies import get_current_principal, require_roles
from app.api.v1.routes.content import translate
from app.api.v1.routes.test_engine import _handle_domain_error
from app.db.phase5 import Phase5Repository
from app.db.database import DatabaseUnavailable
from app.db.test_engine import AttemptNotFound
from app.domain.test_engine import TestEngineForbidden, TestEngineConflict
from app.schemas.pyq import PYQApprovalRequest
from app.schemas.tests import TestSession

router=APIRouter()


def repository(request):
    if not request.app.state.settings.phase5_enabled or not request.app.state.settings.test_engine_enabled:
        raise HTTPException(503,detail={'code':'phase5_not_enabled','message':'PYQ papers and detailed analytics are awaiting setup.'})
    return Phase5Repository(request.app.state.database,workflows_enabled=request.app.state.settings.admin_workflows_enabled)


@router.get('/admin/pyq/candidates')
def candidates(request: Request,principal=Depends(require_roles('test_manager','administrator','super_administrator'))):
    return translate(lambda:repository(request).candidates())


@router.post('/admin/pyq/versions/{version_id}/approve')
def approve(version_id: UUID,payload: PYQApprovalRequest,request: Request,principal=Depends(require_roles('administrator','super_administrator'))):
    return translate(lambda:repository(request).approve_paper(version_id,payload,principal.user_id,request.state.request_id))


@router.get('/pyq/papers')
def papers(request: Request,exam: str=Query('',max_length=80),year: int|None=Query(None,ge=1900,le=2200),
           page: int=Query(1,ge=1),page_size: int=Query(12,ge=1,le=50),principal=Depends(get_current_principal)):
    return translate(lambda:repository(request).papers(exam,year,page,page_size,principal.user_id))


@router.post('/pyq/papers/{version_id}/attempts',response_model=TestSession,status_code=201)
def start_paper(version_id: UUID,request: Request,principal=Depends(get_current_principal)):
    repository(request)
    # Resolve only public published approved papers; version pinning avoids
    # starting a newer paper than the student chose.
    from sqlalchemy import text
    def lookup():
        with request.app.state.database.read_only_transaction() as c:
            return c.execute(text("SELECT t.id FROM public.pyq_papers p JOIN public.test_versions v ON v.id=p.test_version_id "
                                  "JOIN public.tests t ON t.id=v.test_id WHERE p.test_version_id=:id AND v.status='published' "
                                  "AND t.status='published' AND t.visibility='public'"),{'id':version_id}).first()
    row=translate(lookup)
    if row is None: raise HTTPException(404)
    try:
        return request.app.state.test_engine_repository.start_attempt(test_id=str(row[0]),version_id=str(version_id),user_id=principal.user_id)
    except (DatabaseUnavailable,AttemptNotFound,TestEngineForbidden,TestEngineConflict) as exc:
        raise _handle_domain_error(exc) from None


@router.get('/students/me/performance')
def performance(request: Request,principal=Depends(get_current_principal)):
    return translate(lambda:repository(request).performance(principal.user_id))
