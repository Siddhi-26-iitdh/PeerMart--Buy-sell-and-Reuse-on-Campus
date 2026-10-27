from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.favourite import Favourite
from app.schemas.favourites import FavouriteListResponse, FavouriteResponse


router = APIRouter(prefix="/favourites", tags=["Favourite"])


@router.get("", response_model=FavouriteListResponse)
def list_favourites(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Favourite))
    items = db.scalars(
        select(Favourite)
        .order_by(Favourite.favourite_id)
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
    response_model=FavouriteResponse,
    responses={404: {"description": "Favourite not found"}},
)
def get_favourite(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Favourite, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Favourite not found",
        )

    return item
