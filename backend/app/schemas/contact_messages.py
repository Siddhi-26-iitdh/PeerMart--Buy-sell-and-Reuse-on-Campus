from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

VALID_INQUIRY_CATEGORIES = Literal[
    "General Inquiry",
    "Account Issue",
    "Listing Report",
    "Deactivation Request",
]


class ContactMessageCreate(BaseModel):
    category: VALID_INQUIRY_CATEGORIES = "General Inquiry"
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
    status: Literal["new", "in_progress", "resolved", "open", "reviewed"]
    admin_reply: str | None = Field(default=None, max_length=2000)


class ContactMessageResponse(BaseModel):
    message_id: int
    user_id: int
    sender_name: str
    sender_email: str
    listing_id: int | None
    listing_title: str | None
    category: str
    subject: str
    message: str
    status: str
    admin_reply: str | None = None
    reviewed_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None


class ContactMessageListResponse(BaseModel):
    items: list[ContactMessageResponse]
    total: int
    page: int
    size: int
