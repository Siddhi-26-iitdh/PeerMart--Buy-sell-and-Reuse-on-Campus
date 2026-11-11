from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import field_validator, BaseModel, Field
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


    @field_validator("phone_no")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None
        phone = value.strip()
        if not phone:
            return None
        if not (len(phone) == 10 and phone.isascii()
                and phone.isdigit() and phone[0] in "6789"):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return phone


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



class ProfileUpdateRequest(BaseModel):
    f_name: str = Field(min_length=1, max_length=100)
    l_name: str = Field(min_length=1, max_length=100)
    phone_no: str = Field(min_length=10, max_length=20)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    data: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = request.session.get("user_id")

    if user_id is None:
        raise HTTPException(401, "Not authenticated")

    user = db.get(User, user_id)

    if user is None or user.account_status != "active":
        raise HTTPException(401, "Not authenticated")

    first_name = data.f_name.strip()
    last_name = data.l_name.strip()
    phone = data.phone_no.strip()

    if not first_name or not last_name:
        raise HTTPException(422, "Name cannot be empty")

    if len(phone) != 10 or not phone.isascii() or not phone.isdigit() or phone[0] not in "6789":
        raise HTTPException(
            422,
            "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9",
        )

    user.f_name = first_name
    user.l_name = last_name
    user.phone_no = phone

    db.commit()
    db.refresh(user)

    return user


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}
