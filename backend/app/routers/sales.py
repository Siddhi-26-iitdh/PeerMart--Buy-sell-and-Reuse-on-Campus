from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.cart_item import CartItem
from app.models.category import Category
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.offer import Offer
from app.models.payment import Payment
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sales import (
    MockPaymentRequest,
    MockPaymentResponse,
    SaleDetailListResponse,
    SaleDetailResponse,
    SaleListResponse,
    SaleResponse,
)
from app.services.receipt_pdf import ReceiptData, generate_receipt_pdf

router = APIRouter(prefix="/sales", tags=["Sale"])
payments_router = APIRouter(prefix="/payments", tags=["Payments"])


def _enrich_sales(db: Session, sales: list[Sale]) -> list[SaleDetailResponse]:
    if not sales:
        return []

    offer_ids = {s.offer_id for s in sales}
    sale_ids = {s.sale_id for s in sales}

    offers = {
        off.offer_id: off
        for off in db.scalars(
            select(Offer).where(Offer.offer_id.in_(offer_ids))
        ).all()
    }
    listing_ids = {off.listing_id for off in offers.values()}
    listings = {
        lst.listing_id: lst
        for lst in db.scalars(
            select(Listing).where(Listing.listing_id.in_(listing_ids))
        ).all()
    }

    buyer_ids = {off.buyer_id for off in offers.values()}
    seller_ids = {lst.seller_id for lst in listings.values()}
    user_ids = buyer_ids | seller_ids
    users = {
        u.user_id: u
        for u in db.scalars(select(User).where(User.user_id.in_(user_ids))).all()
    }

    category_ids = {lst.category_id for lst in listings.values()}
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

    payments_by_sale = {
        p.sale_id: p
        for p in db.scalars(
            select(Payment).where(Payment.sale_id.in_(sale_ids))
        ).all()
        if p.sale_id is not None
    }

    enriched: list[SaleDetailResponse] = []
    for sale in sales:
        off = offers.get(sale.offer_id)
        lst = listings.get(off.listing_id) if off else None
        seller = users.get(lst.seller_id) if lst else None
        buyer = users.get(off.buyer_id) if off else None
        payment = payments_by_sale.get(sale.sale_id)

        receipt_number = (
            payment.receipt_number
            if payment and payment.receipt_number
            else f"PM-RCPT-{sale.sale_id:05d}"
        )
        payment_reference = (
            payment.payment_reference
            if payment and payment.payment_reference
            else f"PAY-DEMO-{sale.sale_id:05d}"
        )
        payment_method = (
            payment.payment_method if payment else "Demo / Mock Payment"
        )

        enriched.append(
            SaleDetailResponse(
                sale_id=sale.sale_id,
                offer_id=sale.offer_id,
                final_price=sale.final_price,
                sold_at=sale.sold_at,
                listing_id=lst.listing_id if lst else 0,
                title=lst.title if lst else "Listing",
                category=(
                    categories.get(lst.category_id, "Other") if lst else "Other"
                ),
                item_condition=lst.item_condition if lst else "used",
                image=images_by_listing.get(lst.listing_id) if lst else None,
                listed_price=lst.price if lst else sale.final_price,
                offered_price=off.offered_price if off else sale.final_price,
                seller_id=lst.seller_id if lst else 0,
                seller_name=(
                    f"{seller.f_name} {seller.l_name}".strip() if seller else ""
                ),
                seller_email=seller.email if seller else "",
                buyer_id=off.buyer_id if off else 0,
                buyer_name=(
                    f"{buyer.f_name} {buyer.l_name}".strip() if buyer else ""
                ),
                buyer_email=buyer.email if buyer else "",
                receipt_number=receipt_number,
                payment_reference=payment_reference,
                payment_method=payment_method,
                payment_status="SUCCESS (SIMULATED)",
                receipt_url=f"/api/sales/{sale.sale_id}/receipt",
            )
        )
    return enriched


@router.get("", response_model=SaleListResponse)
def list_sales(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(Sale)) or 0
    items = db.scalars(
        select(Sale)
        .order_by(Sale.sale_id)
        .offset((page - 1) * size)
        .limit(size)
    ).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
    }


@router.get("/purchases", response_model=SaleDetailListResponse)
def list_my_purchases(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.count())
        .select_from(Sale)
        .join(Offer, Sale.offer_id == Offer.offer_id)
        .where(Offer.buyer_id == current_user.user_id)
    ) or 0

    rows = list(
        db.scalars(
            select(Sale)
            .join(Offer, Sale.offer_id == Offer.offer_id)
            .where(Offer.buyer_id == current_user.user_id)
            .order_by(Sale.sold_at.desc(), Sale.sale_id.desc())
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    )

    return SaleDetailListResponse(
        items=_enrich_sales(db, rows),
        total=total,
        page=page,
        size=size,
    )


@router.get("/sold", response_model=SaleDetailListResponse)
def list_my_sold_items(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    total = db.scalar(
        select(func.count())
        .select_from(Sale)
        .join(Offer, Sale.offer_id == Offer.offer_id)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(Listing.seller_id == current_user.user_id)
    ) or 0

    rows = list(
        db.scalars(
            select(Sale)
            .join(Offer, Sale.offer_id == Offer.offer_id)
            .join(Listing, Offer.listing_id == Listing.listing_id)
            .where(Listing.seller_id == current_user.user_id)
            .order_by(Sale.sold_at.desc(), Sale.sale_id.desc())
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    )

    return SaleDetailListResponse(
        items=_enrich_sales(db, rows),
        total=total,
        page=page,
        size=size,
    )


@router.get("/{sale_id}/receipt")
def download_sale_receipt(
    sale_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    sale = db.get(Sale, sale_id)
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    offer = db.get(Offer, sale.offer_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Associated offer not found")

    listing = db.get(Listing, offer.listing_id)
    if listing is None:
        raise HTTPException(status_code=404, detail="Associated listing not found")

    if (
        current_user.user_id not in (offer.buyer_id, listing.seller_id)
        and current_user.role != "admin"
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the buyer, seller, or an administrator can download this receipt",
        )

    seller = db.get(User, listing.seller_id)
    buyer = db.get(User, offer.buyer_id)
    category = db.get(Category, listing.category_id)
    payment = db.scalar(select(Payment).where(Payment.sale_id == sale.sale_id))

    receipt_number = (
        payment.receipt_number
        if payment and payment.receipt_number
        else f"PM-RCPT-{sale.sale_id:05d}"
    )
    payment_reference = (
        payment.payment_reference
        if payment and payment.payment_reference
        else f"PAY-DEMO-{sale.sale_id:05d}"
    )
    payment_method = (
        payment.payment_method if payment else "Demo / Mock Payment"
    )

    receipt_data = ReceiptData(
        receipt_number=receipt_number,
        sale_id=sale.sale_id,
        payment_reference=payment_reference,
        transaction_datetime=sale.sold_at,
        payment_status="SUCCESS (SIMULATED)",
        payment_method=payment_method,
        seller_name=(
            f"{seller.f_name} {seller.l_name}".strip() if seller else "Campus Seller"
        ),
        seller_email=seller.email if seller else "",
        buyer_name=(
            f"{buyer.f_name} {buyer.l_name}".strip() if buyer else "Campus Buyer"
        ),
        buyer_email=buyer.email if buyer else "",
        product_name=listing.title,
        product_category=category.category_name if category else "Other",
        listing_id=listing.listing_id,
        product_condition=listing.item_condition,
        original_listed_price=listing.price,
        accepted_offer_price=offer.offered_price,
        final_paid_amount=sale.final_price,
    )

    pdf_bytes = generate_receipt_pdf(receipt_data)
    headers = {
        "Content-Disposition": f'attachment; filename="{receipt_number}.pdf"',
    }
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers,
    )


@router.get(
    "/{item_id}",
    response_model=SaleResponse,
    responses={404: {"description": "Sale not found"}},
)
def get_sale(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Sale, item_id)

    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Sale not found",
        )

    return item


@payments_router.post(
    "/mock",
    response_model=MockPaymentResponse,
    status_code=201,
)
def process_mock_payment(
    payload: MockPaymentRequest,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    offer = db.get(Offer, payload.offer_id)
    if offer is None:
        raise HTTPException(status_code=404, detail="Offer not found")

    listing = db.get(Listing, offer.listing_id)
    if listing is None or listing.status == "removed":
        raise HTTPException(status_code=404, detail="Listing not found")

    if offer.buyer_id != current_user.user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the buyer of the accepted offer can simulate payment",
        )

    existing_sale = db.scalar(
        select(Sale).where(Sale.offer_id == offer.offer_id)
    )
    if offer.status == "paid" or existing_sale is not None:
        raise HTTPException(
            status_code=409,
            detail="Payment has already been processed for this offer",
        )

    if offer.status != "accepted":
        raise HTTPException(
            status_code=409,
            detail="Offer must be accepted by the seller before payment",
        )

    if listing.status == "sold":
        raise HTTPException(
            status_code=409,
            detail="This listing has already been sold",
        )

    seller = db.get(User, listing.seller_id)
    seller_name = f"{seller.f_name} {seller.l_name}".strip() if seller else ""
    seller_email = seller.email if seller else ""
    buyer_name = f"{current_user.f_name} {current_user.l_name}".strip()
    buyer_email = current_user.email
    final_amount = offer.offered_price

    if payload.outcome in ("failed", "cancelled"):
        ref_prefix = "FAIL" if payload.outcome == "failed" else "CANC"
        payment = Payment(
            offer_id=offer.offer_id,
            sale_id=None,
            buyer_id=current_user.user_id,
            amount=final_amount,
            payment_status=payload.outcome,
            payment_method="Demo / Mock Payment",
            payment_reference=f"PAY-DEMO-{ref_prefix}-{uuid4().hex[:8].upper()}",
            receipt_number=None,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return MockPaymentResponse(
            payment_id=payment.payment_id,
            offer_id=offer.offer_id,
            sale_id=None,
            listing_id=listing.listing_id,
            listing_title=listing.title,
            listed_price=listing.price,
            amount=final_amount,
            payment_status=payment.payment_status,
            payment_method=payment.payment_method,
            payment_reference=payment.payment_reference,
            receipt_number=None,
            receipt_url=None,
            seller_name=seller_name,
            seller_email=seller_email,
            buyer_name=buyer_name,
            buyer_email=buyer_email,
            created_at=payment.created_at,
        )

    try:
        sale = Sale(
            offer_id=offer.offer_id,
            final_price=final_amount,
        )
        db.add(sale)
        db.flush()

        payment_reference = f"PAY-DEMO-{sale.sale_id:05d}-{uuid4().hex[:6].upper()}"
        receipt_number = f"PM-RCPT-{sale.sale_id:05d}"

        payment = Payment(
            offer_id=offer.offer_id,
            sale_id=sale.sale_id,
            buyer_id=current_user.user_id,
            amount=final_amount,
            payment_status="success",
            payment_method="Demo / Mock Payment",
            payment_reference=payment_reference,
            receipt_number=receipt_number,
        )
        db.add(payment)

        offer.status = "paid"
        listing.status = "sold"

        # Reject any other remaining offers on this listing and remove from carts
        other_offers = db.scalars(
            select(Offer).where(
                Offer.listing_id == listing.listing_id,
                Offer.offer_id != offer.offer_id,
                Offer.status.in_(["pending", "accepted"]),
            )
        ).all()
        for other in other_offers:
            other.status = "rejected"

        db.execute(
            delete(CartItem).where(CartItem.listing_id == listing.listing_id)
        )

        db.commit()
        db.refresh(sale)
        db.refresh(payment)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Payment or sale already processed",
        ) from exc

    return MockPaymentResponse(
        payment_id=payment.payment_id,
        offer_id=offer.offer_id,
        sale_id=sale.sale_id,
        listing_id=listing.listing_id,
        listing_title=listing.title,
        listed_price=listing.price,
        amount=final_amount,
        payment_status=payment.payment_status,
        payment_method=payment.payment_method,
        payment_reference=payment.payment_reference,
        receipt_number=receipt_number,
        receipt_url=f"/api/sales/{sale.sale_id}/receipt",
        seller_name=seller_name,
        seller_email=seller_email,
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        created_at=payment.created_at,
    )
