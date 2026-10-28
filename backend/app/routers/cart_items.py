from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cart_item import CartItem
from app.schemas.cart_items import CartItemListResponse, CartItemResponse


router = APIRouter(prefix="/cart-items", tags=["CartItem"])


@router.get("", response_model=CartItemListResponse)
def list_cart_items(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(CartItem))
    items = db.scalars(
        select(CartItem)
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
