from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserListResponse, UserResponse

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=UserListResponse)
def list_users(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(User))

    users = db.scalars(
        select(User)
        .order_by(User.user_id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": [
            UserResponse.model_validate(user).model_dump(mode="json")
            for user in users
        ],
        "total": total,
        "page": page,
        "size": size,
    }

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    responses={
        404: {
            "description": "User not found",
            "content": {
                "application/json": {
                    "example": {"detail": "User not found"}
                }
            },
        }
    },
)

def get_user(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user




class UserStatusUpdate(BaseModel):
    account_status: Literal["active", "inactive"]


@router.patch("/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    if user.user_id == admin.user_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot change your own admin account status",
        )

    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be modified through this endpoint",
        )

    user.account_status = payload.account_status

    db.commit()
    db.refresh(user)

    return user
