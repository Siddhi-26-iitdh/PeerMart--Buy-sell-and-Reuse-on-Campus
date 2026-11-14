from pydantic import BaseModel, ConfigDict, Field


class ListingImageCreate(BaseModel):
    listing_id: int = Field(..., ge=1)
    image_path: str | None = Field(default=None, max_length=500)
    image_base64: str | None = None
    filename: str | None = Field(default=None, max_length=200)
    display_order: int | None = Field(default=None, ge=1)


class ListingImageOrderUpdate(BaseModel):
    display_order: int = Field(..., ge=1)


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
