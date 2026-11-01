from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class AdminDashboardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    total_questions: int = Field(ge=0)
    published_questions: int = Field(ge=0)
    draft_questions: int = Field(ge=0)


ManagedRoleCode = Literal["editor", "administrator", "super_administrator"]


class RoleChangeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=10, max_length=500)

    @field_validator("reason")
    @classmethod
    def reason_must_be_nonempty(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 10:
            raise ValueError("Provide a reason of at least 10 non-whitespace characters.")
        return value


class RoleAssignmentResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assignment_id: str
    user_id: str
    role_code: ManagedRoleCode
    already_assigned: bool = False


class AdminAuditItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    actor_user_id: str | None
    action_code: str
    entity_type: str
    entity_id: str
    request_id: str | None
    reason: str | None
    before_state: dict[str, Any] | None
    after_state: dict[str, Any] | None
    created_at: datetime


class AdminAuditPage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[AdminAuditItem]
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total: int = Field(ge=0)
    has_more: bool
