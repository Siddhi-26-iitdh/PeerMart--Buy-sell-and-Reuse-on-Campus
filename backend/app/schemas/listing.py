from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    listing_id: int
    seller_id: int
    category_id: int
    title: str
    description: str
    price: Decimal
    item_condition: str
    brand: str | None
    color: str | None
    status: str
    created_at: datetime
    updated_at: datetime


class ListingListResponse(BaseModel):
    items: list[ListingResponse]
    total: int
    page: int
    size: int