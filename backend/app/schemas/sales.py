from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sale_id: int
    offer_id: int
    final_price: Decimal
    sold_at: datetime


class SaleListResponse(BaseModel):
    items: list[SaleResponse]
    total: int
    page: int
    size: int


class SaleDetailResponse(SaleResponse):
    listing_id: int
    title: str
    category: str
    item_condition: str
    image: str | None = None
    listed_price: Decimal
    offered_price: Decimal
    seller_id: int
    seller_name: str
    seller_email: str
    buyer_id: int
    buyer_name: str
    buyer_email: str
    receipt_number: str
    payment_reference: str
    payment_method: str = "Demo / Mock Payment"
    payment_status: str = "SUCCESS (SIMULATED)"
    receipt_url: str


class SaleDetailListResponse(BaseModel):
    items: list[SaleDetailResponse]
    total: int
    page: int
    size: int


class MockPaymentRequest(BaseModel):
    offer_id: int = Field(..., ge=1)
    outcome: Literal["success", "failed", "cancelled"] = "success"


class MockPaymentResponse(BaseModel):
    payment_id: int
    offer_id: int
    sale_id: int | None = None
    listing_id: int
    listing_title: str
    listed_price: Decimal
    amount: Decimal
    payment_status: str
    payment_method: str
    payment_reference: str
    receipt_number: str | None = None
    receipt_url: str | None = None
    seller_name: str
    seller_email: str
    buyer_name: str
    buyer_email: str
    created_at: datetime
