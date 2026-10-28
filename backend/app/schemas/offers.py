from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class OfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    offer_id: int
    listing_id: int
    buyer_id: int
    offered_price: Decimal
    status: str
    created_at: datetime


class OfferListResponse(BaseModel):
    items: list[OfferResponse]
    total: int
    page: int
    size: int
