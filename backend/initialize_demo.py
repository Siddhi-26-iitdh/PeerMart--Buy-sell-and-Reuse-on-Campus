"""Safely initialize the PeerMart demo catalogue."""

from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Category, Listing, ListingImage, User
from import_final_dataset import import_products
from link_supabase_images import main as link_images


def get_counts():
    db = SessionLocal()
    try:
        return {
            "users": db.scalar(select(func.count()).select_from(User)) or 0,
            "categories": db.scalar(select(func.count()).select_from(Category)) or 0,
            "listings": db.scalar(select(func.count()).select_from(Listing)) or 0,
            "images": db.scalar(select(func.count()).select_from(ListingImage)) or 0,
        }
    finally:
        db.close()


def verify_final_dataset():
    counts = get_counts()

    if (
        counts["users"] < 20
        or counts["categories"] < 8
        or counts["listings"] < 56
        or counts["images"] < 122
    ):
        raise RuntimeError(
            f"Final dataset verification failed: {counts}"
        )

    db = SessionLocal()
    try:
        images = db.scalars(select(ListingImage)).all()
        supabase_images = [
            image
            for image in images
            if image.image_path.startswith("https://")
            and "supabase" in image.image_path.lower()
        ]
        if len(supabase_images) < 122:
            raise RuntimeError(
                f"Expected at least 122 Supabase HTTPS image URLs, found {len(supabase_images)}"
            )
    finally:
        db.close()

    print(f"PASS: {counts['users']} users (>= 20)")
    print(f"PASS: {counts['categories']} categories (>= 8)")
    print(f"PASS: {counts['listings']} listings (>= 56)")
    print(f"PASS: {len(supabase_images)} Supabase image URLs (>= 122)")


def initialize():
    counts = get_counts()
    print(f"Current database: {counts}")

    if (
        counts["users"] >= 20
        and counts["categories"] >= 8
        and counts["listings"] >= 56
        and counts["images"] >= 122
    ):
        verify_final_dataset()
        print("PASS: Existing demo catalogue and user records preserved")
        return

    if counts == {
        "users": 20,
        "categories": 0,
        "listings": 0,
        "images": 0,
    }:
        print("Initializing fresh demo catalogue")
        import_products(confirm=True)
        link_images()
        verify_final_dataset()
        return

    if counts == {
        "users": 20,
        "categories": 8,
        "listings": 56,
        "images": 0,
    }:
        print("Completing previously imported catalogue")
        link_images()
        verify_final_dataset()
        return

    raise RuntimeError(
        "Existing database is not a fresh or complete "
        "PeerMart demo database. Initialization stopped "
        "to protect existing data. Back up and migrate "
        "the database separately."
    )


if __name__ == "__main__":
    initialize()
