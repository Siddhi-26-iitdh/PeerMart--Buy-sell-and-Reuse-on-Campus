from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User


def require_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    user_id = request.session.get("user_id")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
        )

    user = db.get(User, user_id)

    if user is None or user.account_status != "active":
        raise HTTPException(
            status_code=401,
            detail="Invalid or inactive session",
        )

    return user


def require_admin(
    user: User = Depends(require_current_user),
) -> User:
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator access required",
        )

    return user
