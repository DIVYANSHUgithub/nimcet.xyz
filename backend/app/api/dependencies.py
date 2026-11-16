from collections.abc import Callable

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import (
    AuthNotConfigured,
    AuthProviderUnavailable,
    InvalidAccessToken,
    Principal,
)
from app.db.roles import RoleStorageUnavailable, AccountSuspended
from starlette.concurrency import run_in_threadpool

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Principal:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail={"code": "authentication_required", "message": "A valid bearer token is required."},
            headers={"WWW-Authenticate": "Bearer"},
        )

    settings = request.app.state.settings
    if settings.admin_workflows_enabled and not settings.trusted_role_lookup_enabled:
        raise HTTPException(status_code=503, detail={"code": "authorization_not_configured", "message": "Trusted authorization is required for administrative workflows."})

    try:
        identity = await run_in_threadpool(request.app.state.token_verifier.verify, credentials.credentials)
    except AuthNotConfigured:
        raise HTTPException(
            status_code=503,
            detail={"code": "auth_not_configured", "message": "Authentication verification is not configured."},
        ) from None
    except AuthProviderUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "auth_provider_unavailable", "message": "Authentication verification is temporarily unavailable."},
        ) from None
    except InvalidAccessToken:
        raise HTTPException(
            status_code=401,
            detail={"code": "invalid_access_token", "message": "The access token is invalid or expired."},
            headers={"WWW-Authenticate": "Bearer"},
        ) from None

    try:
        roles = await run_in_threadpool(request.app.state.role_resolver.roles_for, identity)
    except AccountSuspended:
        raise HTTPException(status_code=403,detail={'code':'account_suspended','message':'Application access for this account is suspended.'}) from None
    except RoleStorageUnavailable:
        raise HTTPException(
            status_code=503,
            detail={"code": "role_storage_unavailable", "message": "Authorization data is temporarily unavailable."},
        ) from None
    return Principal(user_id=identity.subject, roles=roles)


def require_roles(*required: str) -> Callable:
    async def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if not required or not principal.roles.intersection(required):
            raise HTTPException(
                status_code=403,
                detail={"code": "insufficient_role", "message": "This operation is not permitted."},
            )
        return principal

    return dependency
