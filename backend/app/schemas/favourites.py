from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class FavouriteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    favourite_id: int
    user_id: int
    listing_id: int


class FavouriteListResponse(BaseModel):
    items: list[FavouriteResponse]
    total: int
    page: int
    size: int
