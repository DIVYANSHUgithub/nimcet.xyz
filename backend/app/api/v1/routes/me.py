from fastapi import APIRouter, Depends, Request, Response

from app.api.dependencies import enforce_student_device, get_authenticated_principal, get_current_principal
from app.core.security import Principal
from app.schemas.auth import CurrentUserResponse

router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
def current_user(
    request: Request, principal: Principal = Depends(get_authenticated_principal),
) -> CurrentUserResponse:
    # The separate admin portal uses this endpoint to discover its trusted roles.
    if not principal.roles - {"student"}:
        enforce_student_device(request, principal)
    return CurrentUserResponse(user_id=principal.user_id, roles=sorted(principal.roles))


@router.post("/device")
def register_device(
    request: Request, response: Response, principal: Principal = Depends(get_authenticated_principal),
):
    enforce_student_device(request, principal, replace=True)
    response.headers["Cache-Control"] = "private, no-store"
    return {"registered": True}


@router.get("/device")
def current_device(response: Response, principal: Principal = Depends(get_current_principal)):
    response.headers["Cache-Control"] = "private, no-store"
    return {"registered": True}
