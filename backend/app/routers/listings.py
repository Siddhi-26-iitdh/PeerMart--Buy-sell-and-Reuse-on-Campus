from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_current_user
from app.database import get_db
from app.models.cart_item import CartItem
from app.models.category import Category
from app.models.listing import Listing
from app.models.offer import Offer
from app.models.user import User
from app.schemas.listing import (
    ListingCreate,
    ListingListResponse,
    ListingResponse,
    ListingUpdate,
)

router = APIRouter(prefix="/listings", tags=["Listings"])


def _enrich_listings(db: Session, listings: list[Listing]) -> list[ListingResponse]:
    if not listings:
        return []
    seller_ids = {item.seller_id for item in listings}
    sellers = {
        u.user_id: f"{u.f_name} {u.l_name}".strip()
        for u in db.scalars(select(User).where(User.user_id.in_(seller_ids))).all()
    }
    result: list[ListingResponse] = []
    for item in listings:
        resp = ListingResponse.model_validate(item)
        resp.seller_name = sellers.get(item.seller_id)
        result.append(resp)
    return result


@router.get("", response_model=ListingListResponse)
def list_listings(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    category_id: int | None = Query(None, ge=1),
    seller_id: int | None = Query(None, ge=1),
    q: str | None = Query(None, max_length=200),
    min_price: Decimal | None = Query(None, ge=0),
    max_price: Decimal | None = Query(None, ge=0),
    item_condition: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=400,
            detail="min_price cannot exceed max_price",
        )

    filters = [Listing.status != "removed"]

    if q is not None and q.strip():
        term = q.strip().lower()
        term = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{term}%"
        filters.append(
            or_(
                Listing.title.ilike(pattern, escape="\\"),
                Listing.description.ilike(pattern, escape="\\"),
                Listing.brand.ilike(pattern, escape="\\"),
                Listing.color.ilike(pattern, escape="\\"),
            )
        )

    if category_id is not None:
        filters.append(Listing.category_id == category_id)

    if seller_id is not None:
        filters.append(Listing.seller_id == seller_id)

    if min_price is not None:
        filters.append(Listing.price >= min_price)

    if max_price is not None:
        filters.append(Listing.price <= max_price)

    if item_condition is not None and item_condition.strip():
        filters.append(func.lower(Listing.item_condition) == item_condition.strip().lower())

    if status is not None and status.strip():
        filters.append(func.lower(Listing.status) == status.strip().lower())

    total = db.scalar(
        select(func.count()).select_from(Listing).where(*filters)
    ) or 0

    listings = list(
        db.scalars(
            select(Listing)
            .where(*filters)
            .order_by(Listing.created_at.desc(), Listing.listing_id.desc())
            .offset((page - 1) * size)
            .limit(size)
        ).all()
    )

    return {
        "items": _enrich_listings(db, listings),
        "total": total,
        "page": page,
        "size": size,
    }


@router.get(
    "/{listing_id}",
    response_model=ListingResponse,
    responses={404: {"description": "Listing not found"}},
)
def get_listing(
    listing_id: int,
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)

    if listing is None or listing.status == "removed":
        raise HTTPException(
            status_code=404,
            detail="Listing not found",
        )

    return _enrich_listings(db, [listing])[0]


@router.post("", response_model=ListingResponse, status_code=201)
def create_listing(
    payload: ListingCreate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    category = db.get(Category, payload.category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Category not found")

    listing = Listing(
        seller_id=current_user.user_id,
        category_id=payload.category_id,
        title=payload.title,
        description=payload.description,
        price=payload.price,
        item_condition=payload.item_condition,
        brand=payload.brand.strip() if payload.brand else None,
        color=payload.color.strip() if payload.color else None,
        status=payload.status,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    return _enrich_listings(db, [listing])[0]


@router.patch("/{listing_id}", response_model=ListingResponse)
def update_listing(
    listing_id: int,
    payload: ListingUpdate,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)
    if listing is None or listing.status == "removed":
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only the seller or an administrator can update this listing",
        )

    if listing.status == "sold":
        raise HTTPException(
            status_code=409,
            detail="Sold listings cannot be modified",
        )

    if payload.category_id is not None:
        cat = db.get(Category, payload.category_id)
        if cat is None:
            raise HTTPException(status_code=404, detail="Category not found")
        listing.category_id = payload.category_id

    if payload.title is not None:
        listing.title = payload.title
    if payload.description is not None:
        listing.description = payload.description
    if payload.price is not None:
        listing.price = payload.price
    if payload.item_condition is not None:
        listing.item_condition = payload.item_condition
    if payload.brand is not None:
        listing.brand = payload.brand.strip() or None
    if payload.color is not None:
        listing.color = payload.color.strip() or None
    if payload.status is not None:
        listing.status = payload.status

    db.commit()
    db.refresh(listing)
    return _enrich_listings(db, [listing])[0]


@router.delete("/{listing_id}")
def delete_listing(
    listing_id: int,
    current_user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    listing = db.get(Listing, listing_id)
    if listing is None or listing.status == "removed":
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.seller_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only the seller or an administrator can delete this listing",
        )

    if listing.status == "sold":
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a completed sold listing",
        )

    listing.status = "removed"

    pending_offers = db.scalars(
        select(Offer).where(
            Offer.listing_id == listing_id,
            Offer.status.in_(["pending", "accepted"]),
        )
    ).all()
    for off in pending_offers:
        off.status = "rejected"

    db.execute(delete(CartItem).where(CartItem.listing_id == listing_id))
    db.commit()

    return {"message": "Listing removed", "listing_id": listing_id}
