from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryListResponse, CategoryResponse


router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=CategoryListResponse)
def list_categories(db: Session = Depends(get_db)):
    total = db.scalar(select(func.count()).select_from(Category))

    categories = db.scalars(
        select(Category).order_by(Category.category_id)
    ).all()

    return {
        "items": categories,
        "total": total,
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
