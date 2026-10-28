from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


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
