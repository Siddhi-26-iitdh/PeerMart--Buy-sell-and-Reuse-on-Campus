from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Offer(Base):
    __tablename__ = "offers"

    __table_args__ = (
        Index("ix_offers_buyer_status", "buyer_id", "status"),
        Index("ix_offers_listing_status", "listing_id", "status"),
    )

    offer_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.listing_id"), nullable=False
    )
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"), nullable=False
    )
    offered_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
