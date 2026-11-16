from datetime import datetime,UTC
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Reason(BaseModel):
    model_config=ConfigDict(extra='forbid',str_strip_whitespace=True)
    reason: str=Field(min_length=10,max_length=500)


class RoleReplacement(Reason):
    role: Literal['student','editor','test_manager','administrator','super_administrator']
    expected_role: Literal['student','editor','test_manager','administrator','super_administrator']|None


class AccountChange(Reason):
    status: Literal['active','suspended']
    suspended_until: datetime|None=None

    @field_validator('suspended_until')
    @classmethod
    def timezone_required(cls,value):
        if value is not None and (value.utcoffset() is None or value<=datetime.now(UTC)): raise ValueError('A future time with a timezone is required.')
        return value


class ReviewChange(Reason):
    action: Literal['submit','approve','reject','withdraw']
    expected_revision: int=Field(ge=0)


class TestMetadata(Reason):
    title: str=Field(min_length=1,max_length=240)


class ArchiveMedia(Reason):
    archived: bool=True


class TestAvailability(Reason):
    available: bool
