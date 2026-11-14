from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DeactivationRequestCreate(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


class AccountRequestDecision(BaseModel):
    action: Literal["approve", "reject"]
    admin_comment: str | None = Field(default=None, max_length=1000)


class AccountRequestResponse(BaseModel):
    request_id: int
    user_id: int
    user_name: str
    user_email: str
    user_status: str
    request_type: str
    status: str
    reason: str | None
    admin_comment: str | None
    reviewed_by: int | None
    created_at: datetime
    reviewed_at: datetime | None
    blocking_reasons: list[str] = Field(default_factory=list)


class AccountRequestListResponse(BaseModel):
    items: list[AccountRequestResponse]
    total: int


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    pending_registrations: int
    pending_deactivations: int
    total_listings: int
    available_listings: int
    reserved_listings: int
    sold_listings: int
    total_offers: int
    total_sales: int
    open_contact_messages: int
