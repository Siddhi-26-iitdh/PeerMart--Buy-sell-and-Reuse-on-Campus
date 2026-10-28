from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.offer import Offer
from app.schemas.offers import OfferListResponse, OfferResponse


router = APIRouter(prefix="/offers", tags=["Offer"])


@router.get("", response_model=OfferListResponse)
def list_offers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Offer))
    items = db.scalars(
        select(Offer)
        .order_by(Offer.offer_id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get(
    "/{item_id}",
    response_model=OfferResponse,
    responses={404: {"description": "Offer not found"}},
)
def get_offer(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Offer, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    return item
