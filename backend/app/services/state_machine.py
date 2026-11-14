"""Listing and Offer state-machine helpers and obligation checks for PeerMart."""


OFFER_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"accepted", "rejected", "cancelled", "expired"},
    "accepted": {"payment_pending", "completed", "paid", "cancelled", "rejected", "expired"},
    "payment_pending": {"completed", "paid", "accepted", "cancelled", "expired"},
    "completed": set(),
    "paid": set(),
    "rejected": set(),
    "cancelled": set(),
    "expired": set(),
}

LISTING_TRANSITIONS: dict[str, set[str]] = {
    "draft": {"available", "archived", "removed"},
    "available": {"reserved", "sold", "archived", "removed"},
    "reserved": {"available", "sold", "archived", "removed"},
    "sold": set(),
    "archived": {"available", "removed"},
    "removed": {"available", "archived"},
}

ACTIVE_OFFER_STATUSES = ("pending", "accepted", "payment_pending")


def can_transition_offer(current_status: str, next_status: str) -> bool:
    if current_status == next_status:
        return True
    return next_status in OFFER_TRANSITIONS.get(current_status, set())


def can_transition_listing(current_status: str, next_status: str) -> bool:
    if current_status == next_status:
        return True
    return next_status in LISTING_TRANSITIONS.get(current_status, set())


def get_unresolved_obligation_reasons(db, user_id: int) -> list[str]:
    """Return human-readable reasons blocking account deactivation for user_id."""
    from sqlalchemy import select

    from app.models.listing import Listing
    from app.models.offer import Offer

    reasons: list[str] = []

    buyer_active_offers = db.scalars(
        select(Offer).where(
            Offer.buyer_id == user_id,
            Offer.status.in_(ACTIVE_OFFER_STATUSES),
        )
    ).all()
    if buyer_active_offers:
        accepted_cnt = sum(1 for o in buyer_active_offers if o.status in ("accepted", "payment_pending"))
        pending_cnt = sum(1 for o in buyer_active_offers if o.status == "pending")
        if accepted_cnt:
            reasons.append(f"{accepted_cnt} accepted offer(s) awaiting buyer payment")
        if pending_cnt:
            reasons.append(f"{pending_cnt} active pending buyer offer(s)")

    seller_active_offers = db.scalars(
        select(Offer)
        .join(Listing, Offer.listing_id == Listing.listing_id)
        .where(
            Listing.seller_id == user_id,
            Offer.status.in_(ACTIVE_OFFER_STATUSES),
        )
    ).all()
    if seller_active_offers:
        reasons.append(f"{len(seller_active_offers)} active offer negotiation(s) on user's listings")

    reserved_listings = db.scalars(
        select(Listing).where(
            Listing.seller_id == user_id,
            Listing.status == "reserved",
        )
    ).all()
    if reserved_listings:
        reasons.append(f"{len(reserved_listings)} reserved listing(s) awaiting transaction completion")

    return reasons
