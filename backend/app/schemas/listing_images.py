from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class ListingImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    image_id: int
    listing_id: int
    image_path: str
    display_order: int


class ListingImageListResponse(BaseModel):
    items: list[ListingImageResponse]
    total: int
    page: int
    size: int
