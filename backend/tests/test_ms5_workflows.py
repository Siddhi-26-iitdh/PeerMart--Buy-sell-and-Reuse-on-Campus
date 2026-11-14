from decimal import Decimal
import io

from fastapi.testclient import TestClient

from app.main import app as fastapi_app
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User
from app.passwords import hash_password


def _seed_marketplace_users(db_session):
    password = "CampusPassword123!"
    seller = User(
        f_name="Rohan",
        l_name="Sharma",
        email="rohan.sharma@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543210",
        role="student",
        account_status="active",
    )
    buyer = User(
        f_name="Ananya",
        l_name="Verma",
        email="ananya.verma@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543211",
        role="student",
        account_status="active",
    )
    outsider = User(
        f_name="Vikram",
        l_name="Patel",
        email="vikram.patel@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543212",
        role="student",
        account_status="active",
    )
    admin = User(
        f_name="Campus",
        l_name="Admin",
        email="admin@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543213",
        role="admin",
        account_status="active",
    )
    books = Category(category_name="Books & Study Materials")
    cycles = Category(category_name="Cycles & Accessories")

    db_session.add_all([seller, buyer, outsider, admin, books, cycles])
    db_session.flush()

    listing1 = Listing(
        seller_id=seller.user_id,
        category_id=books.category_id,
        title="Discrete Mathematics & Its Applications",
        description="7th edition Rosen textbook in clean condition",
        price=Decimal("600.00"),
        item_condition="used",
        brand="McGraw Hill",
        color="Blue",
        status="available",
    )
    listing2 = Listing(
        seller_id=seller.user_id,
        category_id=cycles.category_id,
        title="Hero Gear Bicycle",
        description="21-speed campus bicycle",
        price=Decimal("6000.00"),
        item_condition="used",
        brand="Hero",
        color="Black",
        status="available",
    )
    db_session.add_all([listing1, listing2])
    db_session.commit()

    return {
        "password": password,
        "seller": seller,
        "buyer": buyer,
        "outsider": outsider,
        "admin": admin,
        "books": books,
        "cycles": cycles,
        "listing1": listing1,
        "listing2": listing2,
    }


def test_simultaneous_multi_user_sessions_and_negotiation_to_receipt(client, db_session):
    """Tasks I, J, K, L, O (items 1-15): Independent sessions, negotiation, mock payment, and PDF receipt."""
    data = _seed_marketplace_users(db_session)
    pw = data["password"]
    listing_id = data["listing1"].listing_id

    with (
        TestClient(fastapi_app) as seller_client,
        TestClient(fastapi_app) as buyer_client,
        TestClient(fastapi_app) as outsider_client,
    ):
        # 1. Independent logins in separate sessions
        s_login = seller_client.post(
            "/api/auth/login",
            json={"email": data["seller"].email, "password": pw},
        )
        b_login = buyer_client.post(
            "/api/auth/login",
            json={"email": data["buyer"].email, "password": pw},
        )
        o_login = outsider_client.post(
            "/api/auth/login",
            json={"email": data["outsider"].email, "password": pw},
        )
        assert s_login.status_code == 200
        assert b_login.status_code == 200
        assert o_login.status_code == 200

        # Verify each session identifies its own user independently
        assert seller_client.get("/api/auth/me").json()["email"] == data["seller"].email
        assert buyer_client.get("/api/auth/me").json()["email"] == data["buyer"].email
        assert outsider_client.get("/api/auth/me").json()["email"] == data["outsider"].email

        # Seller cannot make an offer on their own listing
        self_offer = seller_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "500.00"},
        )
        assert self_offer.status_code == 400

        # 2. Buyer submits an offer; outsider also submits a competing offer
        offer_res = buyer_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "500.00"},
        )
        assert offer_res.status_code == 201
        offer_body = offer_res.json()
        offer_id = offer_body["offer_id"]
        assert offer_body["status"] == "pending"
        # 8. Buyer receives seller's email address in offer confirmation
        assert offer_body["seller_email"] == data["seller"].email

        competing_res = outsider_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "480.00"},
        )
        assert competing_res.status_code == 201
        competing_id = competing_res.json()["offer_id"]

        # 3 & 4. Buyer views sent offer; Seller views received offers
        sent_list = buyer_client.get("/api/offers/sent").json()
        assert sent_list["total"] == 1
        assert sent_list["items"][0]["offer_id"] == offer_id
        assert sent_list["items"][0]["status"] == "pending"

        rec_list = seller_client.get("/api/offers/received").json()
        assert rec_list["total"] == 2

        # 9. Unauthorized user (buyer) cannot accept the offer
        unauth_accept = buyer_client.patch(
            f"/api/offers/{offer_id}",
            json={"status": "accepted"},
        )
        assert unauth_accept.status_code == 403

        # 5 & 7. Seller accepts buyer's offer; listing becomes reserved (not sold yet!)
        accept_res = seller_client.patch(
            f"/api/offers/{offer_id}",
            json={"status": "accepted"},
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "accepted"

        # Listing is reserved, and competing offer is automatically rejected
        listing_after_accept = buyer_client.get(f"/api/listings/{listing_id}").json()
        assert listing_after_accept["status"] == "reserved"
        outsider_sent = outsider_client.get("/api/offers/sent").json()["items"][0]
        assert outsider_sent["status"] == "rejected"

        # No completed sale exists before mock payment
        assert buyer_client.get("/api/sales/purchases").json()["total"] == 0

        # 11. Simulate Failed Payment -> does NOT create a completed sale
        failed_pay = buyer_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "failed"},
        )
        assert failed_pay.status_code == 201
        assert failed_pay.json()["payment_status"] == "failed"
        assert failed_pay.json()["sale_id"] is None
        assert buyer_client.get("/api/sales/purchases").json()["total"] == 0

        # 9. Outsider cannot pay for buyer's accepted offer
        outsider_pay = outsider_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "success"},
        )
        assert outsider_pay.status_code == 403

        # 10 & 13. Buyer simulates Successful Payment -> creates Sale and marks listing Sold
        success_pay = buyer_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "success"},
        )
        assert success_pay.status_code == 201
        pay_data = success_pay.json()
        assert pay_data["payment_status"] == "success"
        assert Decimal(str(pay_data["amount"])) == Decimal("500.00")
        sale_id = pay_data["sale_id"]
        assert sale_id is not None
        assert pay_data["receipt_number"].startswith("PM-RCPT-")

        # 12. Duplicate payment is prevented (HTTP 409)
        dup_pay = buyer_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "success"},
        )
        assert dup_pay.status_code == 409

        # Listing is now Sold, buyer sees purchase, seller sees completed sale
        assert buyer_client.get(f"/api/listings/{listing_id}").json()["status"] == "sold"
        purchases = buyer_client.get("/api/sales/purchases").json()
        assert purchases["total"] == 1
        assert purchases["items"][0]["sale_id"] == sale_id

        sold_items = seller_client.get("/api/sales/sold").json()
        assert sold_items["total"] == 1
        assert sold_items["items"][0]["sale_id"] == sale_id

        # 14 & 15. PDF Receipt generation and authorization
        outsider_rcpt = outsider_client.get(f"/api/sales/{sale_id}/receipt")
        assert outsider_rcpt.status_code == 403

        buyer_rcpt_1 = buyer_client.get(f"/api/sales/{sale_id}/receipt")
        assert buyer_rcpt_1.status_code == 200
        assert buyer_rcpt_1.headers["content-type"] == "application/pdf"
        assert buyer_rcpt_1.content.startswith(b"%PDF")
        assert b"Indian Institute of Technology Dharwad" in buyer_rcpt_1.content
        assert b"DEMO PAYMENT RECEIPT" in buyer_rcpt_1.content
        assert pay_data["receipt_number"].encode("ascii") in buyer_rcpt_1.content
        assert data["seller"].email.encode("ascii") in buyer_rcpt_1.content
        assert data["buyer"].email.encode("ascii") in buyer_rcpt_1.content
        assert b"This receipt was generated by PeerMart" in buyer_rcpt_1.content

        # Seller can also download the exact same receipt without changing transaction data
        seller_rcpt = seller_client.get(f"/api/sales/{sale_id}/receipt")
        assert seller_rcpt.status_code == 200
        assert seller_rcpt.content == buyer_rcpt_1.content


def test_offer_reject_and_buyer_cancel_workflows(client, db_session):
    """Task J & O (items 5, 6, 7): Pending -> Cancelled by buyer, and Pending -> Rejected by seller."""
    data = _seed_marketplace_users(db_session)
    pw = data["password"]
    listing_id = data["listing2"].listing_id

    with (
        TestClient(fastapi_app) as seller_client,
        TestClient(fastapi_app) as buyer_client,
    ):
        seller_client.post("/api/auth/login", json={"email": data["seller"].email, "password": pw})
        buyer_client.post("/api/auth/login", json={"email": data["buyer"].email, "password": pw})

        # Buyer submits offer and then cancels it
        off1 = buyer_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "5200.00"},
        ).json()
        cancel_res = buyer_client.patch(
            f"/api/offers/{off1['offer_id']}",
            json={"status": "cancelled"},
        )
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # Seller sees Cancelled
        seller_received = seller_client.get("/api/offers/received").json()["items"]
        assert any(o["offer_id"] == off1["offer_id"] and o["status"] == "cancelled" for o in seller_received)

        # Buyer submits a new offer; Seller rejects it
        off2 = buyer_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "5400.00"},
        ).json()
        reject_res = seller_client.patch(
            f"/api/offers/{off2['offer_id']}",
            json={"status": "rejected"},
        )
        assert reject_res.status_code == 200
        assert reject_res.json()["status"] == "rejected"

        # Buyer sees Rejected
        buyer_sent = buyer_client.get("/api/offers/sent").json()["items"]
        assert any(o["offer_id"] == off2["offer_id"] and o["status"] == "rejected" for o in buyer_sent)


def test_listings_crud_image_upload_cart_favourites_and_auth_delete(client, db_session, tmp_path, monkeypatch):
    """Task N & O (item 17): Listings CRUD, multipart image upload & persistence, cart, favourites, and DELETE /api/auth/me."""
    monkeypatch.setenv("PEERMART_UPLOAD_DIR", str(tmp_path))
    data = _seed_marketplace_users(db_session)
    pw = data["password"]

    with (
        TestClient(fastapi_app) as seller_client,
        TestClient(fastapi_app) as buyer_client,
    ):
        seller_client.post("/api/auth/login", json={"email": data["seller"].email, "password": pw})
        buyer_client.post("/api/auth/login", json={"email": data["buyer"].email, "password": pw})

        # Seller creates a new listing
        created_listing = seller_client.post(
            "/api/listings",
            json={
                "category_id": data["books"].category_id,
                "title": "Operating System Concepts",
                "description": "Silberschatz 10th edition",
                "price": "450.00",
                "item_condition": "used",
                "brand": "Wiley",
                "color": "Blue",
            },
        )
        assert created_listing.status_code == 201
        new_listing_id = created_listing.json()["listing_id"]

        # Seller uploads 2 images via multipart/form-data
        fake_png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01"
            b"\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        img1_res = seller_client.post(
            "/api/listing-images",
            data={"listing_id": str(new_listing_id), "display_order": "1"},
            files={"file": ("cover.png", io.BytesIO(fake_png), "image/png")},
        )
        assert img1_res.status_code == 201
        img1 = img1_res.json()
        assert img1["image_path"].startswith("/api/uploads/")

        img2_res = seller_client.post(
            "/api/listing-images",
            data={"listing_id": str(new_listing_id), "display_order": "2"},
            files={"file": ("back.png", io.BytesIO(fake_png), "image/png")},
        )
        assert img2_res.status_code == 201
        img2 = img2_res.json()

        # Verify uploaded image is persisted on disk and served over HTTP
        served = buyer_client.get(img1["image_path"])
        assert served.status_code == 200
        assert served.content == fake_png

        # Reorder image 2 to display_order 1
        reorder_res = seller_client.patch(
            f"/api/listing-images/{img2['image_id']}",
            json={"display_order": 1},
        )
        assert reorder_res.status_code == 200
        assert reorder_res.json()["display_order"] == 1

        # Delete image 1
        del_img = seller_client.delete(f"/api/listing-images/{img1['image_id']}")
        assert del_img.status_code == 200

        # Buyer adds listing to cart & favourites
        cart_add = buyer_client.post("/api/cart-items", json={"listing_id": new_listing_id})
        assert cart_add.status_code == 201
        assert buyer_client.get("/api/cart-items").json()["total"] == 1

        fav_add = buyer_client.post("/api/favourites", json={"listing_id": new_listing_id})
        assert fav_add.status_code == 201
        assert buyer_client.get("/api/favourites").json()["total"] == 1

        # Remove from cart & favourites
        assert buyer_client.delete(f"/api/cart-items/{new_listing_id}").status_code == 200
        assert buyer_client.delete(f"/api/favourites/{new_listing_id}").status_code == 200

        # Seller updates listing
        patched = seller_client.patch(
            f"/api/listings/{new_listing_id}",
            json={"price": "400.00", "title": "Operating System Concepts 10e"},
        )
        assert patched.status_code == 200
        assert Decimal(str(patched.json()["price"])) == Decimal("400.00")

        # Seller deletes listing
        deleted = seller_client.delete(f"/api/listings/{new_listing_id}")
        assert deleted.status_code == 200
        assert buyer_client.get(f"/api/listings/{new_listing_id}").status_code == 404

        # Buyer deactivates own account via DELETE /api/auth/me
        deact = buyer_client.delete("/api/auth/me")
        assert deact.status_code == 200
        assert buyer_client.get("/api/auth/me").status_code == 401


def test_56_listings_and_122_supabase_images_dataset_preserved():
    """Task O (item 16): Verify finalized 56-listing and 122-Supabase-image dataset files are intact."""
    import json
    from pathlib import Path
    from import_final_dataset import load_products

    products = load_products()
    assert len(products) == 56

    manifest_path = Path(__file__).resolve().parent.parent / "dataset" / "supabase_images_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    total_images = len(manifest) if isinstance(manifest, list) else sum(len(item.get("images", [])) for item in manifest.get("products", []))
    assert total_images == 122
