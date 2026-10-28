from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sale import Sale
from app.schemas.sales import SaleListResponse, SaleResponse


router = APIRouter(prefix="/sales", tags=["Sale"])


@router.get("", response_model=SaleListResponse)
def list_sales(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Sale))
    items = db.scalars(
        select(Sale)
        .order_by(Sale.sale_id)
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
    response_model=SaleResponse,
    responses={404: {"description": "Sale not found"}},
)
def get_sale(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Sale, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Sale not found",
        )

    return item
