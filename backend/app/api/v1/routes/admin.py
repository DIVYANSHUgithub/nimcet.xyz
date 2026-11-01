from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.api.dependencies import require_roles
from app.core.security import Principal
from app.db.admin import AdminRepository
from app.db.database import DatabaseUnavailable
from app.db.roles import (
    LastSuperAdministrator,
    RoleAssignmentNotFound,
    RoleAssignmentRepository,
    RoleNotFound,
)
from app.schemas.admin import (
    AdminAuditPage,
    AdminDashboardResponse,
    ManagedRoleCode,
    RoleAssignmentResponse,
    RoleChangeRequest,
)

router = APIRouter()
ADMIN_ROLES = ("editor", "administrator", "super_administrator")


def _is_self(principal: Principal, user_id: UUID) -> bool:
    try:
        return UUID(principal.user_id) == user_id
    except ValueError:
        # A malformed verified subject must not be usable for role administration.
        return True


@router.get("/dashboard", response_model=AdminDashboardResponse)
def dashboard(
    request: Request,
    _principal: Principal = Depends(require_roles(*ADMIN_ROLES)),
) -> AdminDashboardResponse:
    try:
        counts = AdminRepository(request.app.state.database).dashboard_counts()
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "database_unavailable", "message": "Admin dashboard is temporarily unavailable."},
        ) from None
    return AdminDashboardResponse(**counts)


@router.get("/audit-log", response_model=AdminAuditPage)
def audit_log(
    request: Request,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _principal: Principal = Depends(require_roles("super_administrator")),
) -> AdminAuditPage:
    try:
        items, total, actual_page = AdminRepository(request.app.state.database).audit_page(
            page=page,
            page_size=page_size,
        )
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "database_unavailable", "message": "Admin audit log is temporarily unavailable."},
        ) from None
    return AdminAuditPage(
        items=items,
        page=actual_page,
        page_size=page_size,
        total=total,
        has_more=actual_page * page_size < total,
    )


@router.post("/users/{user_id}/roles/{role_code}", response_model=RoleAssignmentResponse)
def grant_role(
    user_id: UUID,
    role_code: ManagedRoleCode,
    body: RoleChangeRequest,
    request: Request,
    principal: Principal = Depends(require_roles("super_administrator")),
) -> RoleAssignmentResponse:
    if _is_self(principal, user_id):
        raise HTTPException(
            status_code=409,
            detail={"code": "self_role_change_forbidden", "message": "You cannot change your own roles."},
        )
    try:
        result = RoleAssignmentRepository(request.app.state.database).grant(
            user_id=user_id,
            role_code=role_code,
            actor_id=UUID(principal.user_id),
            reason=body.reason,
            request_id=request.state.request_id,
        )
    except RoleNotFound:
        raise HTTPException(
            status_code=404,
            detail={"code": "role_not_found", "message": "The requested role is not available."},
        ) from None
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "role_storage_unavailable", "message": "Role changes are temporarily unavailable."},
        ) from None
    return RoleAssignmentResponse(**result.__dict__)


@router.delete("/users/{user_id}/roles/{role_code}", response_model=RoleAssignmentResponse)
def revoke_role(
    user_id: UUID,
    role_code: ManagedRoleCode,
    body: RoleChangeRequest,
    request: Request,
    principal: Principal = Depends(require_roles("super_administrator")),
) -> RoleAssignmentResponse:
    if _is_self(principal, user_id):
        raise HTTPException(
            status_code=409,
            detail={"code": "self_role_change_forbidden", "message": "You cannot change your own roles."},
        )
    try:
        result = RoleAssignmentRepository(request.app.state.database).revoke(
            user_id=user_id,
            role_code=role_code,
            actor_id=UUID(principal.user_id),
            reason=body.reason,
            request_id=request.state.request_id,
        )
    except RoleNotFound:
        raise HTTPException(
            status_code=404,
            detail={"code": "role_not_found", "message": "The requested role is not available."},
        ) from None
    except RoleAssignmentNotFound:
        raise HTTPException(
            status_code=404,
            detail={"code": "role_assignment_not_found", "message": "The active role assignment was not found."},
        ) from None
    except LastSuperAdministrator:
        raise HTTPException(
            status_code=409,
            detail={"code": "last_super_administrator", "message": "The last super administrator cannot be revoked."},
        ) from None
    except DatabaseUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "role_storage_unavailable", "message": "Role changes are temporarily unavailable."},
        ) from None
    return RoleAssignmentResponse(**result.__dict__)
