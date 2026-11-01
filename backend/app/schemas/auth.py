from pydantic import BaseModel, ConfigDict


class CurrentUserResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: str
    roles: list[str]
