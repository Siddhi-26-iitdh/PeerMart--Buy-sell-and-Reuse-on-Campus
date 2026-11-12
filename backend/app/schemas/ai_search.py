from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.listing import ListingResponse

MAX_QUERY_WORDS = 300


class AISearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=3000)

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Search query cannot be empty")
        words = cleaned.split()
        if len(words) > MAX_QUERY_WORDS:
            raise ValueError(
                f"Search query cannot exceed {MAX_QUERY_WORDS} words"
            )
        return cleaned


class AISearchFilters(BaseModel):
    category: str | None = None
    keywords: list[str] = Field(default_factory=list)
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)
    condition: Literal["new", "used"] | None = None

    @field_validator("keywords")
    @classmethod
    def sanitize_keywords(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for kw in value[:8]:
            token = kw.strip()
            if token and len(token) <= 60:
                cleaned.append(token)
        return cleaned


class AISearchResponse(BaseModel):
    query: str
    interpreted_filters: AISearchFilters
    fallback_used: bool
    fallback_reason: str | None = None
    total: int
    items: list[ListingResponse]
