"""Import the finalized PeerMart product catalogue."""

import csv
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import delete, select

from app.database import SessionLocal
from app.models import (
    CartItem,
    Category,
    Favourite,
    Listing,
    ListingImage,
    Offer,
    Sale,
    User,
)

CSV_PATH = Path(__file__).parent / "dataset" / "products.csv"

CATEGORIES = {
    "CT01": "Books & Study Materials",
    "CT02": "Electronics & Gadgets",
    "CT03": "Clothing & Fashion",
    "CT04": "Stationery & Academic Accessories",
    "CT05": "Sports & Fitness",
    "CT06": "Daily Use & Hostel Essentials",
    "CT07": "Cycles & Accessories",
    "CT08": "Other",
}

EXPECTED_COUNTS = {
    "CT01": 8,
    "CT02": 8,
    "CT03": 6,
    "CT04": 6,
    "CT05": 6,
    "CT06": 2,
    "CT07": 10,
    "CT08": 10,
}


def load_products():
    products = []
    counts = {code: 0 for code in CATEGORIES}
    seen_ids = set()

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)

        required = {
            "product_id",
            "category_code",
            "title",
            "price",
            "color",
            "brand",
            "item_condition",
            "description",
        }

        if not required.issubset(reader.fieldnames or []):
            raise ValueError("CSV is missing required columns")

        for row in reader:
            code = row["category_code"].strip()
            product_id = row["product_id"].strip()
            title = row["title"].strip()
            description = row["description"].strip()
            condition = row["item_condition"].strip().lower()

            if code not in CATEGORIES:
                raise ValueError(f"Invalid category: {code}")

            if not product_id.startswith(code + "/"):
                raise ValueError(f"Invalid product ID: {product_id}")

            if product_id in seen_ids:
                raise ValueError(f"Duplicate product ID: {product_id}")

            if not title or not description:
                raise ValueError(f"Missing title/description: {product_id}")

            if len(title) > 200:
                raise ValueError(f"Title too long: {product_id}")

            if condition not in {"new", "used"}:
                raise ValueError(f"Invalid condition: {product_id}")

            try:
                price = Decimal(row["price"].strip())
            except (InvalidOperation, AttributeError):
                raise ValueError(f"Invalid price: {product_id}")

            if not price.is_finite() or price <= 0:
                raise ValueError(f"Nonpositive price: {product_id}")

            if price.as_tuple().exponent < -2:
                raise ValueError(f"Too many price decimals: {product_id}")

            if price > Decimal("99999999.99"):
                raise ValueError(f"Price exceeds database limit: {product_id}")

            color = row["color"].strip() or None
            brand = row["brand"].strip() or None

            if color and len(color) > 50:
                raise ValueError(f"Color too long: {product_id}")

            if brand and len(brand) > 100:
                raise ValueError(f"Brand too long: {product_id}")

            products.append({
                "product_id": product_id,
                "category_code": code,
                "title": title,
                "description": description,
                "price": price,
                "color": color,
                "brand": brand,
                "item_condition": condition,
            })

            seen_ids.add(product_id)
            counts[code] += 1

    if counts != EXPECTED_COUNTS:
        raise ValueError(f"Unexpected category counts: {counts}")

    if len(products) != 56:
        raise ValueError(f"Expected 56 products, found {len(products)}")

    return products


def import_products(confirm=False):
    products = load_products()
    print(f"PASS: Validated {len(products)} products")

    if not confirm:
        print("DRY RUN: Database unchanged")
        return

    db = SessionLocal()

    try:
        students = db.scalars(
            select(User)
            .where(
                User.role == "student",
                User.account_status == "active",
            )
            .order_by(User.user_id)
        ).all()

        users = db.scalars(select(User)).all()

        if len(users) != 20 or len(students) != 19:
            raise RuntimeError("Expected 20 users and 19 active students")

        # Snapshot user identities and password hashes before replacement.
        original_users = {
            user.user_id: (
                user.email,
                user.role,
                user.account_status,
                user.password_hash,
            )
            for user in users
        }

        # Delete dependent records before parent records.
        for model in (
            Sale,
            Offer,
            CartItem,
            Favourite,
            ListingImage,
            Listing,
            Category,
        ):
            db.execute(delete(model))

        db.flush()

        category_ids = {}

        for code, name in CATEGORIES.items():
            category = Category(category_name=name)
            db.add(category)
            db.flush()
            category_ids[code] = category.category_id

        for index, product in enumerate(products):
            seller = students[index % len(students)]

            listing = Listing(
                seller_id=seller.user_id,
                category_id=category_ids[product["category_code"]],
                title=product["title"],
                description=product["description"],
                price=product["price"],
                item_condition=product["item_condition"],
                brand=product["brand"],
                color=product["color"],
                status="available",
            )
            db.add(listing)

        db.flush()

        if db.query(Listing).count() != 56:
            raise RuntimeError("Listing count verification failed")

        if db.query(Category).count() != 8:
            raise RuntimeError("Category count verification failed")

        # Verify every imported listing before committing.
        saved_listings = db.scalars(
            select(Listing).order_by(Listing.listing_id)
        ).all()

        expected_titles = sorted(p["title"] for p in products)
        actual_titles = sorted(item.title for item in saved_listings)

        if actual_titles != expected_titles:
            raise RuntimeError("Imported product titles do not match CSV")

        if any(item.status != "available" for item in saved_listings):
            raise RuntimeError("Some listings are not available")

        if db.query(User).count() != 20:
            raise RuntimeError("User count verification failed")

        current_users = {
            user.user_id: (
                user.email,
                user.role,
                user.account_status,
                user.password_hash,
            )
            for user in db.scalars(select(User)).all()
        }

        if current_users != original_users:
            raise RuntimeError("User account integrity check failed")

        db.commit()

        print("PASS: Imported 56 listings and 8 categories")
        print("PASS: Preserved 20 user accounts")
        print("PASS: Old marketplace transactions cleared")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Replace marketplace data in MySQL",
    )
    args = parser.parse_args()

    import_products(confirm=args.confirm)
