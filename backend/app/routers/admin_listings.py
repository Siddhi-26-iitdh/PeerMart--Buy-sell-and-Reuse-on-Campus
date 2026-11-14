from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin
from app.database import get_db
from app.models.listing import Listing
from app.models.offer import Offer
from app.schemas.listing import ListingResponse

router = APIRouter(
    prefix="/admin/listings",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


class AdminListingStatusUpdate(BaseModel):
    status: Literal["available", "archived", "removed"]


@router.patch("/{listing_id}/status", response_model=ListingResponse)
def update_listing_status(
    listing_id: int,
    payload: AdminListingStatusUpdate,
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)

    if listing is None:
        raise HTTPException(
            status_code=404,
            detail="Listing not found",
        )

    if listing.status == payload.status:
        return listing

    existing_offer = db.scalar(
        select(Offer.offer_id)
        .where(Offer.listing_id == listing_id)
        .limit(1)
    )

    if existing_offer is not None:
        raise HTTPException(
            status_code=409,
            detail="Cannot moderate a listing with existing offers or transactions",
        )

    listing.status = payload.status

    db.commit()
    db.refresh(listing)

    return listing
