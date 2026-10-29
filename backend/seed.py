"""Repeat-safe development seed data for PeerMart."""

import hashlib
import os
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.models.category import Category
from app.models.listing import Listing
from app.models.listing_image import ListingImage
from app.models.cart_item import CartItem
from app.models.favourite import Favourite
from app.models.offer import Offer
from app.models.sale import Sale


def hash_password(password):
    iterations = 600_000
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, iterations
    )
    return f"pbkdf2_sha256${iterations}${salt.hex()}${digest.hex()}"


def get_or_create(db, model, lookup, **values):
    record = db.scalar(select(model).filter_by(**lookup))
    if record is None:
        record = model(**lookup, **values)
        db.add(record)
        db.flush()
    return record


PRODUCTS = [
    ("Engineering Mathematics Textbook", "Books", 350),
    ("Scientific Calculator", "Electronics", 650),
    ("Study Table Lamp", "Hostel Essentials", 400),
    ("Secondhand Bicycle", "Cycles", 2500),
    ("Wooden Study Chair", "Furniture", 900),
    ("Python Programming Book", "Books", 300),
    ("Wireless Mouse", "Electronics", 450),
    ("Notebook Bundle", "Stationery", 180),
    ("Electric Kettle", "Hostel Essentials", 700),
    ("Desk Organizer", "Stationery", 150),
    ("Data Structures Textbook", "Books", 420),
    ("USB Keyboard", "Electronics", 500),
    ("Hostel Mattress", "Hostel Essentials", 1200),
    ("Mountain Bicycle", "Cycles", 3200),
    ("Foldable Study Table", "Furniture", 1100),
    ("Digital Electronics Book", "Books", 380),
    ("Bluetooth Speaker", "Electronics", 800),
    ("Geometry Instrument Box", "Stationery", 120),
    ("Extension Board", "Hostel Essentials", 250),
    ("Cycle Helmet", "Cycles", 550),
    ("Plastic Storage Rack", "Furniture", 650),
    ("Physics Reference Book", "Books", 280),
    ("USB-C Charger", "Electronics", 600),
    ("Whiteboard and Markers", "Stationery", 300),
    ("Clothes Drying Stand", "Hostel Essentials", 750),
]


def seed():
    db = SessionLocal()

    try:
        students = []

        for number in range(1, 20):
            student = get_or_create(
                db,
                User,
                {"email": f"testuser{number:02d}@iitdh.ac.in"},
                f_name=f"TestStudent{number:02d}",
                l_name="PeerMart",
                password_hash=hash_password("PeerMartDemo2026!"),
                role="student",
                account_status="active",
            )
            students.append(student)

        get_or_create(
            db,
            User,
            {"email": "testadmin@iitdh.ac.in"},
            f_name="Test",
            l_name="Admin",
            password_hash=hash_password("PeerMartDemo2026!"),
            role="admin",
            account_status="active",
        )

        categories = {}
        for name in [
            "Books",
            "Electronics",
            "Furniture",
            "Cycles",
            "Stationery",
            "Hostel Essentials",
        ]:
            categories[name] = get_or_create(
                db, Category, {"category_name": name}
            )

        listings = []

        for index, (title, category_name, price) in enumerate(PRODUCTS):
            seller = students[index % len(students)]
            sold = index < 5

            listing = get_or_create(
                db,
                Listing,
                {
                    "seller_id": seller.user_id,
                    "title": title,
                },
                category_id=categories[category_name].category_id,
                description=(
                    f"Pre-owned {title.lower()}, suitable for "
                    "IIT Dharwad campus students."
                ),
                price=Decimal(str(price)),
                item_condition="good",
                status="sold" if sold else "available",
            )
            listings.append(listing)

            get_or_create(
                db,
                ListingImage,
                {
                    "listing_id": listing.listing_id,
                    "display_order": 1,
                },
                image_path=(
                    f"/images/placeholder/listing-{index + 1:02d}.jpg"
                ),
            )

        for index in range(12):
            listing = listings[index + 5]
            buyer = students[(index + 8) % len(students)]

            if buyer.user_id == listing.seller_id:
                buyer = students[(index + 9) % len(students)]

            get_or_create(
                db,
                CartItem,
                {
                    "user_id": buyer.user_id,
                    "listing_id": listing.listing_id,
                },
            )

            get_or_create(
                db,
                Favourite,
                {
                    "user_id": buyer.user_id,
                    "listing_id": listing.listing_id,
                },
            )

        for index in range(12):
            listing = listings[index]
            buyer = students[(index + 7) % len(students)]

            if buyer.user_id == listing.seller_id:
                buyer = students[(index + 8) % len(students)]

            accepted = index < 5

            offer = get_or_create(
                db,
                Offer,
                {
                    "listing_id": listing.listing_id,
                    "buyer_id": buyer.user_id,
                },
                offered_price=listing.price - Decimal("50.00"),
                status="accepted" if accepted else "pending",
            )

            if accepted:
                get_or_create(
                    db,
                    Sale,
                    {"offer_id": offer.offer_id},
                    final_price=offer.offered_price,
                )

        db.commit()
        print("PASS: PeerMart development dataset seeded")

        for model in [
            User, Category, Listing, ListingImage,
            CartItem, Favourite, Offer, Sale,
        ]:
            count = db.query(model).count()
            print(f"{model.__tablename__}: {count}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()