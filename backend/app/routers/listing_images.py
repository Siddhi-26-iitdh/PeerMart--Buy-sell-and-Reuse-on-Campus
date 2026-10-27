from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.listing_image import ListingImage
from app.schemas.listing_images import ListingImageListResponse, ListingImageResponse


router = APIRouter(prefix="/listing-images", tags=["ListingImage"])


@router.get("", response_model=ListingImageListResponse)
def list_listing_images(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(ListingImage))
    items = db.scalars(
        select(ListingImage)
        .order_by(ListingImage.image_id)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/{item_id}",
    response_model=ListingImageResponse,
    responses={404: {"description": "ListingImage not found"}},
)
def get_listing_image(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(ListingImage, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="ListingImage not found",
        )

    return item
