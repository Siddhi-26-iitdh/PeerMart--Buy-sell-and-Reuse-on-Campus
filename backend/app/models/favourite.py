from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Favourite(Base):
    __tablename__ = "favourites"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "listing_id",
            name="uq_favourites_user_listing",
        ),
    )

    favourite_id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"), nullable=False
    )
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.listing_id"), nullable=False
    )
