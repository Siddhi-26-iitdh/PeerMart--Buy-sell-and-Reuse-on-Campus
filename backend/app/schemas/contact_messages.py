from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class ContactMessageCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5, max_length=2000)
    listing_id: int | None = Field(default=None, ge=1)

    @field_validator("subject", "message")
    @classmethod
    def strip_non_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be blank")
        return cleaned


class ContactMessageStatusUpdate(BaseModel):
    status: Literal["open", "reviewed", "resolved"]


class ContactMessageResponse(BaseModel):
    message_id: int
    user_id: int
    sender_name: str
    sender_email: str
    listing_id: int | None
    listing_title: str | None
    subject: str
    message: str
    status: str
    created_at: datetime


class ContactMessageListResponse(BaseModel):
    items: list[ContactMessageResponse]
    total: int
    page: int
    size: int
