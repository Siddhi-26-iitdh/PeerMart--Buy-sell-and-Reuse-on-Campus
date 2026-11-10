"""Link uploaded Supabase images to PeerMart MySQL listings."""

import csv
import json
from collections import defaultdict
from pathlib import Path

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Category, Listing, ListingImage, User

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "dataset" / "products.csv"
MANIFEST_PATH = ROOT / "dataset" / "supabase_images_manifest.json"


def main():
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as file:
        products = list(csv.DictReader(file))

    manifest = json.loads(MANIFEST_PATH.read_text())

    images_by_product = defaultdict(list)

    for item in manifest:
        parts = item["object_path"].split("/")

        if len(parts) != 3:
            raise RuntimeError("Unexpected image path")

        product_id = f"{parts[0]}/{parts[1]}"
        images_by_product[product_id].append(item)

    if len(products) != 56 or len(manifest) != 122:
        raise RuntimeError("Unexpected dataset counts")

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

        listings = db.scalars(
            select(Listing).order_by(Listing.listing_id)
        ).all()

        if len(students) != 19 or len(listings) != 56:
            raise RuntimeError("Unexpected users or listings")

        categories = {
            category.category_id: category.category_name
            for category in db.scalars(select(Category)).all()
        }

        expected_categories = {
            "CT01": "Books & Study Materials",
            "CT02": "Electronics & Gadgets",
            "CT03": "Clothing & Fashion",
            "CT04": "Stationery & Academic Accessories",
            "CT05": "Sports & Fitness",
            "CT06": "Daily Use & Hostel Essentials",
            "CT07": "Cycles & Accessories",
            "CT08": "Other",
        }

        # The importer inserted listings in CSV order.
        for index, (product, listing) in enumerate(zip(products, listings)):
            expected_seller = students[index % len(students)].user_id

            if listing.title != product["title"]:
                raise RuntimeError(
                    f"Title mismatch at listing {listing.listing_id}"
                )

            if listing.seller_id != expected_seller:
                raise RuntimeError(
                    f"Seller mismatch at listing {listing.listing_id}"
                )

            expected_category = expected_categories[product["category_code"]]

            if categories.get(listing.category_id) != expected_category:
                raise RuntimeError("Category mismatch")

            if listing.price != __import__("decimal").Decimal(product["price"]):
                raise RuntimeError("Price mismatch")

            if listing.item_condition != product["item_condition"]:
                raise RuntimeError("Condition mismatch")

            product_images = sorted(
                images_by_product[product["product_id"]],
                key=lambda image: image["object_path"],
            )

            if not 2 <= len(product_images) <= 5:
                raise RuntimeError(
                    f"Invalid image count for {product['product_id']}"
                )

            existing = db.scalars(
                select(ListingImage)
                .where(ListingImage.listing_id == listing.listing_id)
                .order_by(ListingImage.display_order)
            ).all()

            expected_paths = [
                image["public_url"] for image in product_images
            ]

            if existing:
                actual_paths = [image.image_path for image in existing]

                if actual_paths != expected_paths:
                    raise RuntimeError(
                        f"Existing images differ for listing {listing.listing_id}"
                    )
                continue

            for display_order, image in enumerate(product_images, start=1):
                db.add(
                    ListingImage(
                        listing_id=listing.listing_id,
                        image_path=image["public_url"],
                        display_order=display_order,
                    )
                )

        db.flush()

        if db.query(ListingImage).count() != 122:
            raise RuntimeError("Expected exactly 122 image records")

        db.commit()

        print("PASS: 122 image records linked to MySQL")
        print("PASS: All 56 listings have 2–5 images")
        print("PASS: Existing users and listings preserved")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()
