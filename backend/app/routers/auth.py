from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.account_request import AccountRequest
from app.models.user import User
from app.passwords import hash_password, verify_password
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


def normalized_email(email: str) -> str:
    email = email.strip().lower()
    if not email.endswith("@iitdh.ac.in") or email.count("@") != 1:
        raise HTTPException(422, "Valid IIT Dharwad email required")
    return email


def _clean_indian_phone(value: str | None) -> str | None:
    if value is None:
        return None
    phone = value.strip()
    if not phone:
        return None
    cleaned = phone.replace(" ", "").replace("-", "")
    if cleaned.startswith("+91") and len(cleaned) == 13:
        cleaned = cleaned[3:]
    if not (
        len(cleaned) == 10
        and cleaned.isascii()
        and cleaned.isdigit()
        and cleaned[0] in "6789"
    ):
        raise ValueError("Enter a valid 10-digit Indian mobile number")
    return cleaned


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

    @field_validator("phone_no")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        return _clean_indian_phone(value)


class ForgotPasswordRequest(BaseModel):
    email: str
    phone_no: str | None = Field(default=None, max_length=20)
    reason: str | None = Field(default=None, max_length=500)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    email = normalized_email(data.email)

    if not data.terms_accepted:
        raise HTTPException(422, "Terms and privacy notice must be accepted")

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
        account_status="pending",
        terms_accepted_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )

    db.add(user)
    db.flush()

    reg_request = AccountRequest(
        user_id=user.user_id,
        request_type="registration",
        status="pending",
        reason="New student registration awaiting administrator approval",
    )
    db.add(reg_request)
    db.commit()
    db.refresh(user)

    # Req 7: Do not establish an authenticated session until an admin approves the account.
    request.session.clear()
    return user


@router.post("/login", response_model=UserResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = normalized_email(data.email)

    user = db.scalar(select(User).where(func.lower(User.email) == email))

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    if user.account_status == "pending":
        raise HTTPException(
            403,
            "Your registration is pending administrator approval. Please wait for an admin to approve your account.",
        )

    if user.account_status == "rejected":
        raise HTTPException(
            403,
            "Your registration request was rejected by the administrator.",
        )

    if user.account_status != "active":
        raise HTTPException(403, "Account is deactivated or inactive")

    request.session.clear()
    request.session["user_id"] = user.user_id

    return user


@router.post("/forgot-password", status_code=201)
def request_password_reset(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = normalized_email(data.email)
    user = db.scalar(select(User).where(func.lower(User.email) == email))

    if user is not None and user.account_status == "active" and user.role != "admin":
        phone_verified = False
        cleaned_input_phone = None
        if data.phone_no and data.phone_no.strip():
            try:
                cleaned_input_phone = _clean_indian_phone(data.phone_no)
            except ValueError:
                cleaned_input_phone = None
        if cleaned_input_phone and user.phone_no and cleaned_input_phone == user.phone_no:
            phone_verified = True

        verification_note = (
            "Identity verified: registered phone number matched."
            if phone_verified
            else "Manual identity verification required by administrator."
        )
        user_reason = data.reason.strip() if data.reason and data.reason.strip() else "Student requested password reset."
        combined_reason = f"{verification_note} Note: {user_reason}"

        existing_pending = db.scalar(
            select(AccountRequest).where(
                AccountRequest.user_id == user.user_id,
                AccountRequest.request_type == "password_reset",
                AccountRequest.status == "pending",
            )
        )
        if existing_pending is not None:
            existing_pending.reason = combined_reason
        else:
            db.add(
                AccountRequest(
                    user_id=user.user_id,
                    request_type="password_reset",
                    status="pending",
                    reason=combined_reason,
                )
            )
        db.commit()

    return {
        "message": (
            "If an active @iitdh.ac.in student account exists for this email, "
            "your password reset request has been submitted for administrator verification."
        )
    }


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
    phone = data.phone_no.strip().replace(" ", "").replace("-", "")
    if phone.startswith("+91") and len(phone) == 13:
        phone = phone[3:]

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


@router.delete("/me")
def delete_me(
    current_user: User = Depends(require_current_user),
):
    raise HTTPException(
        status_code=403,
        detail=(
            "Direct account deactivation is disabled. "
            "Please submit an account deactivation request for administrator approval."
        ),
    )


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"message": "Logged out successfully"}
