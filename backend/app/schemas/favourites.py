from pydantic import BaseModel, ConfigDict, Field


class FavouriteCreate(BaseModel):
    listing_id: int = Field(..., ge=1)


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
