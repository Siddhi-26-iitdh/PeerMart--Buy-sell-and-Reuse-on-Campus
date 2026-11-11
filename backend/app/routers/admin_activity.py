from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth_dependencies import require_admin
from app.database import get_db
from app.models.user import User
from app.models.listing import Listing
from app.models.offer import Offer
from app.models.sale import Sale

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("/users/{user_id}/activity")
def get_user_activity(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(404, "User not found")

    listings = db.scalars(
        select(Listing)
        .where(Listing.seller_id == user_id)
        .order_by(Listing.created_at.desc())
    ).all()

    buyer_offers = db.scalars(
        select(Offer)
        .where(Offer.buyer_id == user_id)
        .order_by(Offer.created_at.desc())
    ).all()

    seller_offers = db.scalars(
        select(Offer)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(Listing.seller_id == user_id)
        .order_by(Offer.created_at.desc())
    ).all()

    purchases = db.execute(
        select(Sale, Offer, Listing)
        .join(Offer, Sale.offer_id == Offer.offer_id)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(Offer.buyer_id == user_id)
    ).all()

    sold = db.execute(
        select(Sale, Offer, Listing)
        .join(Offer, Sale.offer_id == Offer.offer_id)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(Listing.seller_id == user_id)
    ).all()

    def listing_data(item):
        return {
            "listing_id": item.listing_id,
            "title": item.title,
            "price": float(item.price),
            "status": item.status,
        }

    def offer_data(item):
        listing = db.get(Listing, item.listing_id)
        return {
            "offer_id": item.offer_id,
            "listing_id": item.listing_id,
            "title": listing.title if listing else "Unknown listing",
            "offered_price": float(item.offered_price),
            "status": item.status,
        }

    def sale_data(row):
        sale, offer, listing = row
        return {
            "sale_id": sale.sale_id,
            "listing_id": listing.listing_id,
            "title": listing.title,
            "final_price": float(sale.final_price),
            "sold_at": sale.sold_at.isoformat(),
        }

    return {
        "user": {
            "user_id": user.user_id,
            "name": f"{user.f_name} {user.l_name}",
            "email": user.email,
            "phone_no": user.phone_no,
            "role": user.role,
            "account_status": user.account_status,
        },
        "listings": [listing_data(item) for item in listings],
        "seller_negotiations": [
            offer_data(item) for item in seller_offers
        ],
        "buyer_negotiations": [
            offer_data(item) for item in buyer_offers
        ],
        "completed_purchases": [
            sale_data(row) for row in purchases
        ],
        "sold_items": [
            sale_data(row) for row in sold
        ],
    }
