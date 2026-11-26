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
from app.db.database import DatabaseUnavailable
from app.db.pass_devices import DeviceConflict, DeviceSessionExpired, claim_device, device_type
from starlette.concurrency import run_in_threadpool

bearer_scheme = HTTPBearer(auto_error=False)


async def get_authenticated_principal(
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
    return Principal(user_id=identity.subject, roles=roles, session_id=identity.session_id)


def enforce_student_device(request: Request, principal: Principal, *, replace: bool = False):
    if not request.app.state.settings.enforce_device_sessions:
        return
    if principal.session_id is None:
        raise HTTPException(401, detail={"code": "device_session_required", "message": "Sign in again to verify this device."})
    kind = device_type(request.headers.get("user-agent", ""))
    try:
        claim_device(request.app.state.database, principal.user_id, principal.session_id, kind, replace=replace)
    except DeviceConflict:
        raise HTTPException(409, detail={
            "code": "device_slot_conflict", "message": "You were signed out because your account signed in on another device of the same type."
        }) from None
    except DeviceSessionExpired:
        raise HTTPException(401, detail={
            "code": "device_session_required", "message": "Your sign-in has expired. Please sign in again."
        }) from None
    except DatabaseUnavailable:
        raise HTTPException(503, detail={
            "code": "device_session_unavailable", "message": "Your device session could not be checked. Try again."
        }) from None


async def get_current_principal(
    request: Request, principal: Principal = Depends(get_authenticated_principal),
) -> Principal:
    await run_in_threadpool(enforce_student_device, request, principal)
    return principal


async def get_optional_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> Principal | None:
    if credentials is None:
        return None
    principal = await get_authenticated_principal(request, credentials)
    return await get_current_principal(request, principal)


def require_roles(*required: str) -> Callable:
    async def dependency(principal: Principal = Depends(get_authenticated_principal)) -> Principal:
        if not required or not principal.roles.intersection(required):
            raise HTTPException(
                status_code=403,
                detail={"code": "insufficient_role", "message": "This operation is not permitted."},
            )
        return principal

    return dependency
