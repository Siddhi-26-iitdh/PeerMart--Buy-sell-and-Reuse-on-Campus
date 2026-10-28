from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.listing import Listing
from app.schemas.listing import ListingListResponse, ListingResponse


router = APIRouter(prefix="/listings", tags=["Listings"])


@router.get("", response_model=ListingListResponse)
def list_listings(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    category_id: int | None = Query(None, ge=1),
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    item_condition: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=400,
            detail="min_price cannot exceed max_price",
        )

    filters = []

    if category_id is not None:
        filters.append(Listing.category_id == category_id)

    if min_price is not None:
        filters.append(Listing.price >= min_price)

    if max_price is not None:
        filters.append(Listing.price <= max_price)

    if item_condition is not None:
        filters.append(Listing.item_condition == item_condition)

    if status is not None:
        filters.append(Listing.status == status)

    total = db.scalar(
        select(func.count()).select_from(Listing).where(*filters)
    )

    listings = db.scalars(
        select(Listing)
        .where(*filters)
        .order_by(Listing.created_at.desc(), Listing.listing_id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": listings,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get(
    "/{listing_id}",
    response_model=ListingResponse,
    responses={404: {"description": "Listing not found"}},
)
def get_listing(
    listing_id: int,
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)

    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Listing not found",
        )

    return listing
