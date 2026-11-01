from collections.abc import Callable

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import (
    AuthNotConfigured,
    AuthProviderUnavailable,
    InvalidAccessToken,
    Principal,
)

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

    try:
        identity = request.app.state.token_verifier.verify(credentials.credentials)
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

    roles = request.app.state.role_resolver.roles_for(identity)
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
