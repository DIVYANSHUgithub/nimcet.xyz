from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_principal
from app.core.security import Principal
from app.schemas.auth import CurrentUserResponse

router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
async def current_user(principal: Principal = Depends(get_current_principal)) -> CurrentUserResponse:
    return CurrentUserResponse(user_id=principal.user_id, roles=sorted(principal.roles))
