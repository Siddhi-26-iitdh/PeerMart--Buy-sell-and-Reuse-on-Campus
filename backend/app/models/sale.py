from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Sale(Base):
    __tablename__ = "sales"

    sale_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    offer_id: Mapped[int] = mapped_column(
        ForeignKey("offers.offer_id"), unique=True, nullable=False
    )
    final_price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    sold_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
