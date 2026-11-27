
from fastapi import APIRouter, HTTPException, Request, Response

from app.db.pass_devices import device_sessions_ready

router = APIRouter()


def check_readiness(request: Request) -> None:
    database_ready = request.app.state.database.ready()
    auth_ready = request.app.state.token_verifier.configured

    settings = request.app.state.settings

    authorization_ready = (
        not settings.admin_workflows_enabled
        or settings.trusted_role_lookup_enabled
    )

    payments_ready = not settings.payments_enabled or (
        database_ready
        and settings.payments_configured
        and request.app.state.payment_repository.ready()
    )

    sessions_ready = not settings.enforce_device_sessions or (
        database_ready
        and device_sessions_ready(request.app.state.database)
    )

    if not all([
        database_ready,
        auth_ready,
        authorization_ready,
        payments_ready,
        sessions_ready
    ]):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "not_ready",
                "message": "Required backend dependencies are not ready."
            }
        )


# GET /health
@router.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}


# HEAD /health
@router.head("/health", include_in_schema=False)
def health_head() -> Response:
    return Response(status_code=200)


# GET /ready
@router.get("/ready", include_in_schema=False)
def readiness(request: Request) -> dict[str, str]:
    check_readiness(request)
    return {"status": "ready"}


# HEAD /ready
@router.head("/ready", include_in_schema=False)
def readiness_head(request: Request) -> Response:
    check_readiness(request)
    return Response(status_code=200)
