from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.favourite import Favourite
from app.models.listing import Listing
from app.models.user import User
from app.schemas.favourites import (
    FavouriteCreate,
    FavouriteListResponse,
    FavouriteResponse,
)

router = APIRouter(prefix="/favourites", tags=["Favourite"])


@router.get("", response_model=FavouriteListResponse)
def list_favourites(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filters = []
    session_user_id = request.session.get("user_id") if hasattr(request, "session") else None
    if session_user_id is not None:
        filters.append(Favourite.user_id == session_user_id)

    total = db.scalar(select(func.count()).select_from(Favourite).where(*filters)) or 0
    items = db.scalars(
        select(Favourite)
        .where(*filters)
        .order_by(Favourite.favourite_id)
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


@router.post("", response_model=FavouriteResponse, status_code=201)
def create_favourite(
    payload: FavouriteCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, payload.listing_id)
    if listing is None or listing.status == "removed":
        raise HTTPException(status_code=404, detail="Listing not found")

    existing = db.scalar(
        select(Favourite).where(
            Favourite.user_id == current_user.user_id,
            Favourite.listing_id == payload.listing_id,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Listing is already in your favourites",
        )

    fav = Favourite(
        user_id=current_user.user_id,
        listing_id=payload.listing_id,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/{item_id}")
def delete_favourite(
    item_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Favourite, item_id)
    if item is not None:
        if item.user_id != current_user.user_id:
            by_listing = db.scalar(
                select(Favourite).where(
                    Favourite.user_id == current_user.user_id,
                    Favourite.listing_id == item_id,
                )
            )
            if by_listing is not None:
                item = by_listing
            else:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to remove another user's favourite",
                )
    else:
        item = db.scalar(
            select(Favourite).where(
                Favourite.user_id == current_user.user_id,
                Favourite.listing_id == item_id,
            )
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Favourite not found")

    db.delete(item)
    db.commit()
    return {"message": "Removed from favourites", "favourite_id": item.favourite_id}
