from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.cart_item import CartItem
from app.models.listing import Listing
from app.models.user import User
from app.schemas.cart_items import (
    CartItemCreate,
    CartItemListResponse,
    CartItemResponse,
)

router = APIRouter(prefix="/cart-items", tags=["CartItem"])


@router.get("", response_model=CartItemListResponse)
def list_cart_items(
    request: Request,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    filters = []
    session_user_id = request.session.get("user_id") if hasattr(request, "session") else None
    if session_user_id is not None:
        filters.append(CartItem.user_id == session_user_id)

    total = db.scalar(select(func.count()).select_from(CartItem).where(*filters)) or 0
    items = db.scalars(
        select(CartItem)
        .where(*filters)
        .order_by(CartItem.cart_item_id)
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
    response_model=CartItemResponse,
    responses={404: {"description": "CartItem not found"}},
)
def get_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(CartItem, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="CartItem not found",
        )

    return item


@router.post("", response_model=CartItemResponse, status_code=201)
def create_cart_item(
    payload: CartItemCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, payload.listing_id)
    if listing is None or listing.status == "removed":
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.status != "available":
        raise HTTPException(
            status_code=409,
            detail="Only available listings can be added to your cart",
        )

    if listing.seller_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot add your own listing to your cart",
        )

    existing = db.scalar(
        select(CartItem).where(
            CartItem.user_id == current_user.user_id,
            CartItem.listing_id == payload.listing_id,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Item is already in your cart",
        )

    item = CartItem(
        user_id=current_user.user_id,
        listing_id=payload.listing_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}")
def delete_cart_item(
    item_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(CartItem, item_id)
    if item is not None:
        if item.user_id != current_user.user_id:
            # Check if item_id was passed as listing_id for current_user
            by_listing = db.scalar(
                select(CartItem).where(
                    CartItem.user_id == current_user.user_id,
                    CartItem.listing_id == item_id,
                )
            )
            if by_listing is not None:
                item = by_listing
            else:
                raise HTTPException(
                    status_code=403,
                    detail="Not authorized to remove another user's cart item",
                )
    else:
        item = db.scalar(
            select(CartItem).where(
                CartItem.user_id == current_user.user_id,
                CartItem.listing_id == item_id,
            )
        )
        if item is None:
            raise HTTPException(status_code=404, detail="CartItem not found")

    db.delete(item)
    db.commit()
    return {"message": "Removed from cart", "cart_item_id": item.cart_item_id}
