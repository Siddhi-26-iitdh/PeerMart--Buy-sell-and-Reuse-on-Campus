from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.category import Category
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.offer import Offer
from app.models.payment import Payment
from app.models.sale import Sale
from app.models.user import User
from app.schemas.offers import (
    OfferCreate,
    OfferDetailListResponse,
    OfferDetailResponse,
    OfferListResponse,
    OfferResponse,
    OfferStatusUpdate,
)
from app.services.state_machine import ACTIVE_OFFER_STATUSES, can_transition_offer

router = APIRouter(prefix="/offers", tags=["Offer"])


def _enrich_offers(
    db: Session,
    offers: list[Offer],
    viewer: User | None = None,
) -> list[OfferDetailResponse]:
    if not offers:
        return []

    listing_ids = {off.listing_id for off in offers}
    buyer_ids = {off.buyer_id for off in offers}
    offer_ids = {off.offer_id for off in offers}

    listings = {
        item.listing_id: item
        for item in db.scalars(
            select(Listing).where(Listing.listing_id.in_(listing_ids))
        ).all()
    }
    seller_ids = {item.seller_id for item in listings.values()}
    category_ids = {item.category_id for item in listings.values()}

    all_user_ids = buyer_ids | seller_ids
    users = {
        u.user_id: u
        for u in db.scalars(select(User).where(User.user_id.in_(all_user_ids))).all()
    }
    categories = {
        c.category_id: c.category_name
        for c in db.scalars(
            select(Category).where(Category.category_id.in_(category_ids))
        ).all()
    }

    images_by_listing: dict[int, str] = {}
    for img in db.scalars(
        select(ListingImage)
        .where(ListingImage.listing_id.in_(listing_ids))
        .order_by(ListingImage.listing_id, ListingImage.display_order)
    ).all():
        if img.listing_id not in images_by_listing:
            images_by_listing[img.listing_id] = img.image_path

    sales_by_offer = {
        s.offer_id: s
        for s in db.scalars(select(Sale).where(Sale.offer_id.in_(offer_ids))).all()
    }
    payments_by_sale = {
        p.sale_id: p
        for p in db.scalars(
            select(Payment).where(Payment.offer_id.in_(offer_ids))
        ).all()
        if p.sale_id is not None
    }

    enriched: list[OfferDetailResponse] = []
    for off in offers:
        listing = listings.get(off.listing_id)
        seller = users.get(listing.seller_id) if listing else None
        buyer = users.get(off.buyer_id)
        sale = sales_by_offer.get(off.offer_id)
        payment = payments_by_sale.get(sale.sale_id) if sale else None
        receipt_num = (
            payment.receipt_number
            if payment and payment.receipt_number
            else (f"PM-RCPT-{sale.sale_id:05d}" if sale else None)
        )

        # Req 1: Reveal seller_email only to the buyer who submitted this offer, the seller, or an admin.
        can_see_seller_email = bool(
            viewer
            and (
                viewer.role == "admin"
                or viewer.user_id == off.buyer_id
                or (listing and viewer.user_id == listing.seller_id)
            )
        )
        can_see_buyer_email = bool(
            viewer
            and (
                viewer.role == "admin"
                or viewer.user_id == off.buyer_id
                or (listing and viewer.user_id == listing.seller_id)
            )
        )

        enriched.append(
            OfferDetailResponse(
                offer_id=off.offer_id,
                listing_id=off.listing_id,
                buyer_id=off.buyer_id,
                offered_price=off.offered_price,
                status=off.status,
                created_at=off.created_at,
                listing_title=listing.title if listing else "Listing",
                listing_price=listing.price if listing else Decimal("0.00"),
                listing_status=listing.status if listing else "removed",
                listing_image=images_by_listing.get(off.listing_id),
                listing_category=(
                    categories.get(listing.category_id, "Other") if listing else "Other"
                ),
                listing_condition=listing.item_condition if listing else "used",
                seller_id=listing.seller_id if listing else 0,
                seller_name=(
                    f"{seller.f_name} {seller.l_name}".strip() if seller else ""
                ),
                seller_email=seller.email if (seller and can_see_seller_email) else "",
                buyer_name=f"{buyer.f_name} {buyer.l_name}".strip() if buyer else "",
                buyer_email=buyer.email if (buyer and can_see_buyer_email) else "",
                sale_id=sale.sale_id if sale else None,
                receipt_number=receipt_num,
                receipt_url=f"/api/sales/{sale.sale_id}/receipt" if sale else None,
            )
        )
    return enriched


@router.get("", response_model=OfferListResponse)
def list_offers(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "admin":
        total = db.scalar(select(func.count()).select_from(Offer)) or 0
        items = db.scalars(
            select(Offer)
            .order_by(Offer.offer_id)
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    else:
        stmt = (
            select(Offer)
            .join(Listing, Offer.listing_id == Listing.listing_id)
            .where(
                or_(
                    Offer.buyer_id == current_user.user_id,
                    Listing.seller_id == current_user.user_id,
                )
            )
        )
        total = db.scalar(
            select(func.count()).select_from(stmt.subquery())
        ) or 0
        items = db.scalars(
            stmt.order_by(Offer.offer_id).offset((page - 1) * size).limit(size)
        ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/sent", response_model=OfferDetailListResponse)
def list_sent_offers(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.count())
        .select_from(Offer)
        .where(Offer.buyer_id == current_user.user_id)
    ) or 0

    rows = list(
        db.scalars(
            select(Offer)
            .where(Offer.buyer_id == current_user.user_id)
            .order_by(Offer.created_at.desc(), Offer.offer_id.desc())
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    )

    return OfferDetailListResponse(
        items=_enrich_offers(db, rows, viewer=current_user),
        total=total,
        page=page,
        size=size,
    )


@router.get("/received", response_model=OfferDetailListResponse)
def list_received_offers(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.count())
        .select_from(Offer)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(Listing.seller_id == current_user.user_id)
    ) or 0

    rows = list(
        db.scalars(
            select(Offer)
            .join(Listing, Offer.listing_id == Listing.listing_id)
            .where(Listing.seller_id == current_user.user_id)
            .order_by(Offer.created_at.desc(), Offer.offer_id.desc())
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    )

    return OfferDetailListResponse(
        items=_enrich_offers(db, rows, viewer=current_user),
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=OfferDetailResponse, status_code=201)
def create_offer(
    payload: OfferCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, payload.listing_id)
    if listing is None or listing.status in ("removed", "archived"):
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id == current_user.user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot make an offer on your own listing",
        )

    if listing.status != "available":
        raise HTTPException(
            status_code=409,
            detail="This listing is no longer available for new offers",
        )

    existing_active = db.scalar(
        select(Offer).where(
            Offer.listing_id == payload.listing_id,
            Offer.buyer_id == current_user.user_id,
            Offer.status.in_(ACTIVE_OFFER_STATUSES),
        )
    )
    if existing_active is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have an active offer on this listing",
        )

    offer = Offer(
        listing_id=payload.listing_id,
        buyer_id=current_user.user_id,
        offered_price=payload.offered_price,
        status="pending",
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return _enrich_offers(db, [offer], viewer=current_user)[0]


@router.patch("/{offer_id}", response_model=OfferDetailResponse)
def update_offer_status(
    offer_id: int,
    payload: OfferStatusUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    offer = db.get(Offer, offer_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found")

    listing = db.get(Listing, offer.listing_id)
    if listing is None or listing.status in ("removed", "archived"):
        raise HTTPException(status_code=404, detail="Listing not found")

    target_status = payload.status
    if not can_transition_offer(offer.status, target_status):
        raise HTTPException(
            status_code=409,
            detail=f"Invalid offer state transition from '{offer.status}' to '{target_status}'",
        )

    if target_status == "accepted":
        if listing.seller_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the listing seller can accept an offer",
            )
        if offer.status != "pending":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot accept an offer with status '{offer.status}'",
            )
        if listing.status != "available":
            raise HTTPException(
                status_code=409,
                detail="Listing is already reserved or sold",
            )

        competing_accepted = db.scalar(
            select(Offer).where(
                Offer.listing_id == listing.listing_id,
                Offer.offer_id != offer.offer_id,
                Offer.status.in_(["accepted", "payment_pending", "completed", "paid"]),
            )
        )
        if competing_accepted is not None:
            raise HTTPException(
                status_code=409,
                detail="Another offer has already been accepted for this listing",
            )

        # Req 11: Reserve listing for accepted buyer, but DO NOT reject competing pending offers yet.
        # Competing offers stay pending until payment succeeds.
        offer.status = "accepted"
        listing.status = "reserved"

    elif target_status == "rejected":
        if listing.seller_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the listing seller can reject an offer",
            )
        was_accepted = offer.status in ("accepted", "payment_pending")
        offer.status = "rejected"
        if was_accepted and listing.status == "reserved":
            listing.status = "available"

    elif target_status == "cancelled":
        if offer.buyer_id != current_user.user_id:
            raise HTTPException(
                status_code=403,
                detail="Only the buyer who submitted the offer can cancel it",
            )
        was_accepted = offer.status in ("accepted", "payment_pending")
        offer.status = "cancelled"
        if was_accepted and listing.status == "reserved":
            listing.status = "available"

    db.commit()
    db.refresh(offer)
    return _enrich_offers(db, [offer], viewer=current_user)[0]


@router.get(
    "/{item_id}",
    response_model=OfferResponse,
    responses={404: {"description": "Offer not found"}},
)
def get_offer(
    item_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Offer, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Offer not found",
        )

    listing = db.get(Listing, item.listing_id)
    if (
        current_user.role != "admin"
        and item.buyer_id != current_user.user_id
        and (listing is None or listing.seller_id != current_user.user_id)
    ):
        raise HTTPException(
            status_code=403,
            detail="Not authorized to view this offer",
        )

    return item
