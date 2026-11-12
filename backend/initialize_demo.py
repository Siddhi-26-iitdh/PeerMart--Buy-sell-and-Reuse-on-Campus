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
            "users": db.scalar(select(func.count()).select_from(User)),
            "categories": db.scalar(select(func.count()).select_from(Category)),
            "listings": db.scalar(select(func.count()).select_from(Listing)),
            "images": db.scalar(select(func.count()).select_from(ListingImage)),
        }
    finally:
        db.close()


def verify_final_dataset():
    counts = get_counts()

    expected = {
        "users": 20,
        "categories": 8,
        "listings": 56,
        "images": 122,
    }

    if counts != expected:
        raise RuntimeError(
            f"Final dataset verification failed: {counts}"
        )

    db = SessionLocal()
    try:
        images = db.scalars(select(ListingImage)).all()

        if not all(
            image.image_path.startswith("https://")
            and "supabase" in image.image_path.lower()
            for image in images
        ):
            raise RuntimeError(
                "Expected Supabase HTTPS image URLs"
            )
    finally:
        db.close()

    print("PASS: 20 users")
    print("PASS: 8 categories")
    print("PASS: 56 listings")
    print("PASS: 122 Supabase image URLs")


def initialize():
    counts = get_counts()
    print(f"Current database: {counts}")

    if counts == {
        "users": 20,
        "categories": 8,
        "listings": 56,
        "images": 122,
    }:
        verify_final_dataset()
        print("PASS: Existing demo catalogue preserved")
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
