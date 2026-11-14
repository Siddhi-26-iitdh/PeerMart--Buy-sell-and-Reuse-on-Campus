from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin, require_current_user
from app.database import get_db
from app.models.contact_message import ContactMessage
from app.models.listing import Listing
from app.models.user import User
from app.schemas.contact_messages import (
    ContactMessageCreate,
    ContactMessageListResponse,
    ContactMessageResponse,
    ContactMessageStatusUpdate,
)

router = APIRouter(tags=["Contact Admin"])


def _serialize_message(
    record: ContactMessage,
    sender: User | None,
    listing: Listing | None,
) -> ContactMessageResponse:
    sender_name = (
        f"{sender.f_name} {sender.l_name}".strip()
        if sender is not None
        else f"User #{record.user_id}"
    )
    sender_email = sender.email if sender is not None else ""
    listing_title = listing.title if listing is not None else None

    return ContactMessageResponse(
        message_id=record.message_id,
        user_id=record.user_id,
        sender_name=sender_name,
        sender_email=sender_email,
        listing_id=record.listing_id,
        listing_title=listing_title,
        subject=record.subject,
        message=record.message,
        status=record.status,
        created_at=record.created_at,
    )


@router.post(
    "/contact-messages",
    response_model=ContactMessageResponse,
    status_code=201,
)
def create_contact_message(
    payload: ContactMessageCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing: Listing | None = None
    if payload.listing_id is not None:
        listing = db.get(Listing, payload.listing_id)
        if listing is None or listing.status == "removed":
            raise HTTPException(
                status_code=404,
                detail="Referenced listing not found",
            )

    record = ContactMessage(
        user_id=current_user.user_id,
        listing_id=payload.listing_id,
        subject=payload.subject,
        message=payload.message,
        status="open",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _serialize_message(record, current_user, listing)


@router.get(
    "/contact-messages/me",
    response_model=ContactMessageListResponse,
)
def list_my_contact_messages(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.count())
        .select_from(ContactMessage)
        .where(ContactMessage.user_id == current_user.user_id)
    ) or 0

    rows = db.scalars(
        select(ContactMessage)
        .where(ContactMessage.user_id == current_user.user_id)
        .order_by(ContactMessage.created_at.desc(), ContactMessage.message_id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    listing_ids = {row.listing_id for row in rows if row.listing_id is not None}
    listings_by_id = (
        {
            item.listing_id: item
            for item in db.scalars(
                select(Listing).where(Listing.listing_id.in_(listing_ids))
            ).all()
        }
        if listing_ids
        else {}
    )

    items = [
        _serialize_message(
            row,
            current_user,
            listings_by_id.get(row.listing_id) if row.listing_id else None,
        )
        for row in rows
    ]

    return ContactMessageListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.get(
    "/admin/contact-messages",
    response_model=ContactMessageListResponse,
    dependencies=[Depends(require_admin)],
)
def admin_list_contact_messages(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    status: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    filters = []
    if status is not None and status.strip():
        filters.append(ContactMessage.status == status.strip().lower())

    total = db.scalar(
        select(func.count()).select_from(ContactMessage).where(*filters)
    ) or 0

    rows = db.scalars(
        select(ContactMessage)
        .where(*filters)
        .order_by(ContactMessage.created_at.desc(), ContactMessage.message_id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    user_ids = {row.user_id for row in rows}
    listing_ids = {row.listing_id for row in rows if row.listing_id is not None}

    users_by_id = (
        {
            u.user_id: u
            for u in db.scalars(
                select(User).where(User.user_id.in_(user_ids))
            ).all()
        }
        if user_ids
        else {}
    )
    listings_by_id = (
        {
            item.listing_id: item
            for item in db.scalars(
                select(Listing).where(Listing.listing_id.in_(listing_ids))
            ).all()
        }
        if listing_ids
        else {}
    )

    items = [
        _serialize_message(
            row,
            users_by_id.get(row.user_id),
            listings_by_id.get(row.listing_id) if row.listing_id else None,
        )
        for row in rows
    ]

    return ContactMessageListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.patch(
    "/admin/contact-messages/{message_id}/status",
    response_model=ContactMessageResponse,
    dependencies=[Depends(require_admin)],
)
def admin_update_contact_message_status(
    message_id: int,
    payload: ContactMessageStatusUpdate,
    db: Session = Depends(get_db),
):
    record = db.get(ContactMessage, message_id)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail="Contact message not found",
        )

    record.status = payload.status
    db.commit()
    db.refresh(record)

    sender = db.get(User, record.user_id)
    listing = db.get(Listing, record.listing_id) if record.listing_id else None
    return _serialize_message(record, sender, listing)
