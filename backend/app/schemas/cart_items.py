from pydantic import BaseModel, ConfigDict, Field


class CartItemCreate(BaseModel):
    listing_id: int = Field(..., ge=1)


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
