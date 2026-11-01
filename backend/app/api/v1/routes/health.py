from fastapi import APIRouter, HTTPException, Request

router = APIRouter()


@router.get("/health", include_in_schema=False)
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", include_in_schema=False)
def readiness(request: Request) -> dict[str, str]:
    database_ready = request.app.state.database.ready()
    auth_ready = request.app.state.token_verifier.configured
    if not database_ready or not auth_ready:
        raise HTTPException(
            status_code=503,
            detail={"code": "not_ready", "message": "Required backend dependencies are not ready."},
        )
    return {"status": "ready"}
