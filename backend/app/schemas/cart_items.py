from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cart_item_id: int
    user_id: int
    listing_id: int


class CartItemListResponse(BaseModel):
    items: list[CartItemResponse]
    total: int
    page: int
    size: int
