from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OfferCreate(BaseModel):
    listing_id: int = Field(..., ge=1)
    offered_price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)


class OfferStatusUpdate(BaseModel):
    status: Literal["accepted", "rejected", "cancelled"]


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    offer_id: int
    listing_id: int
    buyer_id: int
    offered_price: Decimal
    status: str
    created_at: datetime


class OfferDetailResponse(OfferResponse):
    listing_title: str = ""
    listing_price: Decimal = Decimal("0.00")
    listing_status: str = "available"
    listing_image: str | None = None
    listing_category: str = "Other"
    listing_condition: str = "used"
    seller_id: int = 0
    seller_name: str = ""
    seller_email: str = ""
    buyer_name: str = ""
    buyer_email: str = ""
    sale_id: int | None = None
    receipt_number: str | None = None
    receipt_url: str | None = None


class OfferListResponse(BaseModel):
    items: list[OfferResponse]
    total: int
    page: int
    size: int


class OfferDetailListResponse(BaseModel):
    items: list[OfferDetailResponse]
    total: int
    page: int
    size: int
