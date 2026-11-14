from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ListingCreate(BaseModel):
    category_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=2, max_length=5000)
    price: Decimal = Field(..., gt=0, max_digits=10, decimal_places=2)
    item_condition: str = Field(default="used", min_length=2, max_length=30)
    brand: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, max_length=50)
    status: Literal["available", "draft", "reserved", "sold"] = "available"

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("item_condition")
    @classmethod
    def normalize_condition(cls, value: str) -> str:
        cond = value.strip().lower()
        if cond not in {"new", "used", "good", "fair", "like_new"}:
            raise ValueError("item_condition must be 'new' or 'used'")
        return "new" if cond == "new" else "used"


class ListingUpdate(BaseModel):
    category_id: int | None = Field(default=None, ge=1)
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, min_length=2, max_length=5000)
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    item_condition: str | None = Field(default=None, min_length=2, max_length=30)
    brand: str | None = Field(default=None, max_length=100)
    color: str | None = Field(default=None, max_length=50)
    status: Literal["available", "draft", "reserved", "sold", "removed"] | None = None

    @field_validator("title", "description")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Field cannot be empty")
        return cleaned

    @field_validator("item_condition")
    @classmethod
    def normalize_optional_condition(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cond = value.strip().lower()
        if cond not in {"new", "used", "good", "fair", "like_new"}:
            raise ValueError("item_condition must be 'new' or 'used'")
        return "new" if cond == "new" else "used"


class ListingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    listing_id: int
    seller_id: int
    seller_name: str | None = None
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