from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin, require_current_user
from app.database import get_db
from app.models.account_request import AccountRequest
from app.models.contact_message import ContactMessage
from app.models.listing import Listing
from app.models.offer import Offer
from app.models.sale import Sale
from app.models.user import User
from app.schemas.account_requests import (
    AccountRequestDecision,
    AccountRequestListResponse,
    AccountRequestResponse,
    AdminOverviewResponse,
    DeactivationRequestCreate,
)
from app.services.state_machine import get_unresolved_obligation_reasons

router = APIRouter(tags=["Account & Admin Requests"])


def _serialize_request(
    db: Session,
    req: AccountRequest,
    user: User | None,
    include_blocking: bool = False,
) -> AccountRequestResponse:
    blocking: list[str] = []
    if include_blocking and req.request_type == "deactivation" and req.status == "pending":
        blocking = get_unresolved_obligation_reasons(db, req.user_id)

    return AccountRequestResponse(
        request_id=req.request_id,
        user_id=req.user_id,
        user_name=f"{user.f_name} {user.l_name}".strip() if user else f"User #{req.user_id}",
        user_email=user.email if user else "",
        user_status=user.account_status if user else "unknown",
        request_type=req.request_type,
        status=req.status,
        reason=req.reason,
        admin_comment=req.admin_comment,
        reviewed_by=req.reviewed_by,
        created_at=req.created_at,
        reviewed_at=req.reviewed_at,
        blocking_reasons=blocking,
    )


@router.post(
    "/account/deactivation-request",
    response_model=AccountRequestResponse,
    status_code=201,
)
def submit_deactivation_request(
    payload: DeactivationRequestCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator accounts cannot submit deactivation requests here",
        )

    existing_pending = db.scalar(
        select(AccountRequest).where(
            AccountRequest.user_id == current_user.user_id,
            AccountRequest.request_type == "deactivation",
            AccountRequest.status == "pending",
        )
    )
    if existing_pending is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have a pending account deactivation request",
        )

    req = AccountRequest(
        user_id=current_user.user_id,
        request_type="deactivation",
        status="pending",
        reason=payload.reason.strip() if payload.reason else None,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return _serialize_request(db, req, current_user, include_blocking=True)


@router.get(
    "/account/deactivation-request/me",
    response_model=AccountRequestListResponse,
)
def get_my_deactivation_requests(
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    rows = list(
        db.scalars(
            select(AccountRequest)
            .where(
                AccountRequest.user_id == current_user.user_id,
                AccountRequest.request_type == "deactivation",
            )
            .order_by(AccountRequest.created_at.desc(), AccountRequest.request_id.desc())
        ).all()
    )
    items = [_serialize_request(db, r, current_user, include_blocking=True) for r in rows]
    return AccountRequestListResponse(items=items, total=len(items))


@router.get(
    "/admin/overview",
    response_model=AdminOverviewResponse,
    dependencies=[Depends(require_admin)],
)
def get_admin_overview(db: Session = Depends(get_db)):
    return AdminOverviewResponse(
        total_users=db.scalar(select(func.count()).select_from(User)) or 0,
        active_users=db.scalar(
            select(func.count()).select_from(User).where(User.account_status == "active")
        ) or 0,
        pending_registrations=db.scalar(
            select(func.count()).select_from(User).where(User.account_status == "pending")
        ) or 0,
        pending_deactivations=db.scalar(
            select(func.count())
            .select_from(AccountRequest)
            .where(
                AccountRequest.request_type == "deactivation",
                AccountRequest.status == "pending",
            )
        ) or 0,
        total_listings=db.scalar(
            select(func.count())
            .select_from(Listing)
            .where(Listing.status.notin_(["removed", "archived"]))
        ) or 0,
        available_listings=db.scalar(
            select(func.count()).select_from(Listing).where(Listing.status == "available")
        ) or 0,
        reserved_listings=db.scalar(
            select(func.count()).select_from(Listing).where(Listing.status == "reserved")
        ) or 0,
        sold_listings=db.scalar(
            select(func.count()).select_from(Listing).where(Listing.status == "sold")
        ) or 0,
        total_offers=db.scalar(select(func.count()).select_from(Offer)) or 0,
        total_sales=db.scalar(select(func.count()).select_from(Sale)) or 0,
        open_contact_messages=db.scalar(
            select(func.count())
            .select_from(ContactMessage)
            .where(ContactMessage.status.in_(["new", "open", "in_progress", "reviewed"]))
        ) or 0,
    )


@router.get(
    "/admin/registrations",
    response_model=AccountRequestListResponse,
    dependencies=[Depends(require_admin)],
)
def list_registration_requests(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    filters = [AccountRequest.request_type == "registration"]
    if status and status.strip():
        filters.append(AccountRequest.status == status.strip().lower())

    rows = list(
        db.scalars(
            select(AccountRequest)
            .where(*filters)
            .order_by(AccountRequest.created_at.desc(), AccountRequest.request_id.desc())
        ).all()
    )
    user_ids = {r.user_id for r in rows}
    users_by_id = (
        {
            u.user_id: u
            for u in db.scalars(select(User).where(User.user_id.in_(user_ids))).all()
        }
        if user_ids
        else {}
    )

    items = [_serialize_request(db, r, users_by_id.get(r.user_id)) for r in rows]
    return AccountRequestListResponse(items=items, total=len(items))


@router.patch(
    "/admin/registrations/{user_id}",
    response_model=AccountRequestResponse,
)
def decide_registration(
    user_id: int,
    payload: AccountRequestDecision,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot modify admin registration")

    req = db.scalar(
        select(AccountRequest)
        .where(
            AccountRequest.user_id == user_id,
            AccountRequest.request_type == "registration",
        )
        .order_by(AccountRequest.request_id.desc())
    )
    if req is None:
        req = AccountRequest(
            user_id=user_id,
            request_type="registration",
            status="pending",
        )
        db.add(req)
        db.flush()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if payload.action == "approve":
        user.account_status = "active"
        req.status = "approved"
    else:
        user.account_status = "rejected"
        req.status = "rejected"

    req.admin_comment = payload.admin_comment.strip() if payload.admin_comment else None
    req.reviewed_by = admin.user_id
    req.reviewed_at = now
    db.commit()
    db.refresh(req)
    db.refresh(user)

    return _serialize_request(db, req, user)


@router.get(
    "/admin/deactivation-requests",
    response_model=AccountRequestListResponse,
    dependencies=[Depends(require_admin)],
)
def list_deactivation_requests(
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    filters = [AccountRequest.request_type == "deactivation"]
    if status and status.strip():
        filters.append(AccountRequest.status == status.strip().lower())

    rows = list(
        db.scalars(
            select(AccountRequest)
            .where(*filters)
            .order_by(AccountRequest.created_at.desc(), AccountRequest.request_id.desc())
        ).all()
    )
    user_ids = {r.user_id for r in rows}
    users_by_id = (
        {
            u.user_id: u
            for u in db.scalars(select(User).where(User.user_id.in_(user_ids))).all()
        }
        if user_ids
        else {}
    )

    items = [
        _serialize_request(db, r, users_by_id.get(r.user_id), include_blocking=True)
        for r in rows
    ]
    return AccountRequestListResponse(items=items, total=len(items))


@router.patch(
    "/admin/deactivation-requests/{request_id}",
    response_model=AccountRequestResponse,
)
def decide_deactivation_request(
    request_id: int,
    payload: AccountRequestDecision,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    req = db.get(AccountRequest, request_id)
    if req is None or req.request_type != "deactivation":
        raise HTTPException(status_code=404, detail="Deactivation request not found")

    if req.status != "pending":
        raise HTTPException(
            status_code=409,
            detail=f"Deactivation request has already been {req.status}",
        )

    user = db.get(User, req.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if payload.action == "approve":
        blocking = get_unresolved_obligation_reasons(db, user.user_id)
        if blocking:
            raise HTTPException(
                status_code=409,
                detail="Cannot approve deactivation: " + " ".join(blocking),
            )
        user.account_status = "inactive"
        # Anonymize non-essential personal fields while preserving transaction integrity
        user.phone_no = None
        user.gender = None
        # Archive seller's remaining available/draft listings
        open_listings = db.scalars(
            select(Listing).where(
                Listing.seller_id == user.user_id,
                Listing.status.in_(["available", "draft"]),
            )
        ).all()
        for lst in open_listings:
            lst.status = "archived"

        req.status = "approved"
    else:
        req.status = "rejected"

    req.admin_comment = payload.admin_comment.strip() if payload.admin_comment else None
    req.reviewed_by = admin.user_id
    req.reviewed_at = now
    db.commit()
    db.refresh(req)
    db.refresh(user)

    return _serialize_request(db, req, user)
