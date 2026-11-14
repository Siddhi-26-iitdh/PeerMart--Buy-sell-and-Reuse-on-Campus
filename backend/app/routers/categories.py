from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin
from app.database import get_db
from app.models.category import Category
from app.models.listing import Listing
from app.schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
)

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=CategoryListResponse)
def list_categories(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Category)) or 0

    categories = db.scalars(
        select(Category)
        .order_by(Category.category_id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": categories,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    responses={
        404: {
            "description": "Category not found",
            "content": {
                "application/json": {
                    "example": {"detail": "Category not found"}
                }
            },
        }
    },
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)

    if category is None:
        raise HTTPException(
            status_code=404,
            detail="Category not found",
        )

    return category


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=201,
    dependencies=[Depends(require_admin)],
)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Category).where(
            func.lower(Category.category_name) == payload.category_name.lower()
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="Category already exists",
        )
    cat = Category(category_name=payload.category_name)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete(
    "/{category_id}",
    dependencies=[Depends(require_admin)],
)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
):
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    in_use = db.scalar(
        select(Listing.listing_id)
        .where(Listing.category_id == category_id)
        .limit(1)
    )
    if in_use is not None:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete category with existing listings",
        )

    db.delete(category)
    db.commit()
    return {"message": "Category deleted", "category_id": category_id}
