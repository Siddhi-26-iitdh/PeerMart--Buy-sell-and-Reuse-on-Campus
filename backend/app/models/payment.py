from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    __table_args__ = (
        Index("ix_payments_offer_id", "offer_id"),
        Index("ix_payments_buyer_id", "buyer_id"),
    )

    payment_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("offers.offer_id"), nullable=False
    )
    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.sale_id"), unique=True, nullable=True
    )
    buyer_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    payment_status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="success"
    )
    payment_method: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Demo / Mock Payment"
    )
    payment_reference: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    receipt_number: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
