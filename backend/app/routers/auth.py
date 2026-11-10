from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.passwords import hash_password, verify_password
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    f_name: str = Field(min_length=1, max_length=100)
    l_name: str = Field(min_length=1, max_length=100)
    email: str
    password: str = Field(min_length=8, max_length=128)
    gender: str | None = None
    phone_no: str | None = None
    terms_accepted: bool


def normalized_email(email: str) -> str:
    email = email.strip().lower()
    if not email.endswith("@iitdh.ac.in") or email.count("@") != 1:
        raise HTTPException(422, "Valid IIT Dharwad email required")
    return email


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    email = normalized_email(data.email)

    if not data.terms_accepted:
        raise HTTPException(422, "Terms must be accepted")

    existing = db.scalar(select(User).where(func.lower(User.email) == email))
    if existing:
        raise HTTPException(409, "Email already registered")

    user = User(
        f_name=data.f_name.strip(),
        l_name=data.l_name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        gender=data.gender,
        phone_no=data.phone_no,
        role="student",
        account_status="active",
        terms_accepted_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    request.session.clear()
    request.session["user_id"] = user.user_id

    return user


@router.post("/login", response_model=UserResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = normalized_email(data.email)

    user = db.scalar(select(User).where(func.lower(User.email) == email))

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    if user.account_status != "active":
        raise HTTPException(403, "Account is not active")

    request.session.clear()
    request.session["user_id"] = user.user_id

    return user


@router.get("/me", response_model=UserResponse)
def me(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")

    if user_id is None:
        raise HTTPException(401, "Not authenticated")

    user = db.get(User, user_id)

    if user is None or user.account_status != "active":
        request.session.clear()
        raise HTTPException(401, "Not authenticated")

    return user


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}
