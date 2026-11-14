from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ListingImage(Base):
    __tablename__ = "listing_images"

    __table_args__ = (
        UniqueConstraint(
            "listing_id",
            "display_order",
            name="uq_listing_images_listing_display_order",
        ),
    )

    image_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    listing_id: Mapped[int] = mapped_column(
        ForeignKey("listings.listing_id"), nullable=False
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
