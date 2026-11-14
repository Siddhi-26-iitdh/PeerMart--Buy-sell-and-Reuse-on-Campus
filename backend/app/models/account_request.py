from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AccountRequest(Base):
    __tablename__ = "account_requests"

    __table_args__ = (
        Index("ix_account_requests_type_status", "request_type", "status"),
        Index("ix_account_requests_user_id", "user_id"),
    )

    request_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"), nullable=False
    )
    request_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )  # "registration" | "deactivation"
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending"
    )  # "pending" | "approved" | "rejected"
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=func.now()
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
