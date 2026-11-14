import io
from decimal import Decimal

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
        gender="Male",
        role="student",
        account_status="active",
    )
    buyer = User(
        f_name="Ananya",
        l_name="Verma",
        email="ananya.verma@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543211",
        gender="Female",
        role="student",
        account_status="active",
    )
    outsider = User(
        f_name="Vikram",
        l_name="Patel",
        email="vikram.patel@iitdh.ac.in",
        password_hash=hash_password(password),
        phone_no="9876543212",
        gender="Male",
        role="student",
        account_status="active",
    )
    admin = User(
        f_name="Campus",
        l_name="Admin",
        email="testadmin63@iitdh.ac.in",
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
    """Reqs 1, 11, 12, 13, 15, 16, 17: Privacy, competing offers preserved until payment, atomic payment, PDF receipt."""
    data = _seed_marketplace_users(db_session)
    pw = data["password"]
    listing_id = data["listing1"].listing_id

    with (
        TestClient(fastapi_app) as seller_client,
        TestClient(fastapi_app) as buyer_client,
        TestClient(fastapi_app) as outsider_client,
    ):
        #Req 1: Public listing APIs do not expose seller email address
        pub_list = buyer_client.get("/api/listings").json()
        assert all("seller_email" not in item and "email" not in item for item in pub_list["items"])
        pub_detail = buyer_client.get(f"/api/listings/{listing_id}").json()
        assert "seller_email" not in pub_detail and "email" not in pub_detail

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
        # Req 1: Buyer receives seller's email address only after submitting valid offer
        assert offer_body["seller_email"] == data["seller"].email

        competing_res = outsider_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "480.00"},
        )
        assert competing_res.status_code == 201
        competing_offer_id = competing_res.json()["offer_id"]
        assert competing_offer_id is not None

        # Req 13: Seller cannot delete listing while active offers exist
        del_during_offer = seller_client.delete(f"/api/listings/{listing_id}")
        assert del_during_offer.status_code == 409

        # 3 & 4. Buyer views sent offer; Seller views received offers
        sent_list = buyer_client.get("/api/offers/sent").json()
        assert sent_list["total"] == 1
        assert sent_list["items"][0]["offer_id"] == offer_id
        assert sent_list["items"][0]["status"] == "pending"

        rec_list = seller_client.get("/api/offers/received").json()
        assert rec_list["total"] == 2

        # Req 16: Outsider cannot view Buyer's private offer detail
        assert outsider_client.get(f"/api/offers/{offer_id}").status_code == 403

        # Unauthorized user (buyer) cannot accept the offer
        unauth_accept = buyer_client.patch(
            f"/api/offers/{offer_id}",
            json={"status": "accepted"},
        )
        assert unauth_accept.status_code == 403

        # Seller accepts buyer's offer; listing becomes reserved (not sold yet!)
        accept_res = seller_client.patch(
            f"/api/offers/{offer_id}",
            json={"status": "accepted"},
        )
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "accepted"

        # Req 11: Listing is reserved, and competing offer MUST remain pending before payment!
        listing_after_accept = buyer_client.get(f"/api/listings/{listing_id}").json()
        assert listing_after_accept["status"] == "reserved"
        outsider_sent_before_pay = outsider_client.get("/api/offers/sent").json()["items"][0]
        assert outsider_sent_before_pay["status"] == "pending"

        # Seller cannot accept the second offer while the first accepted offer is reserved
        second_accept = seller_client.patch(
            f"/api/offers/{competing_offer_id}",
            json={"status": "accepted"},
        )
        assert second_accept.status_code == 409

        # No completed sale exists before mock payment
        assert buyer_client.get("/api/sales/purchases").json()["total"] == 0

        # Simulate Failed Payment -> does NOT create a completed sale and releases reservation
        failed_pay = buyer_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "failed"},
        )
        assert failed_pay.status_code == 201
        assert failed_pay.json()["payment_status"] == "failed"
        assert failed_pay.json()["sale_id"] is None
        assert buyer_client.get("/api/sales/purchases").json()["total"] == 0

        # Outsider cannot pay for buyer's accepted offer
        outsider_pay = outsider_client.post(
            "/api/payments/mock",
            json={"offer_id": offer_id, "outcome": "success"},
        )
        assert outsider_pay.status_code == 403

        # Buyer simulates Successful Payment -> creates Sale, marks offer completed, marks listing sold, and rejects competing offers
        # Failed payment resets the offer to pending.
        # Seller must accept it again before payment can succeed.
        retry_accept = seller_client.patch(
            f"/api/offers/{offer_id}",
            json={"status": "accepted"},
        )
        assert retry_accept.status_code == 200

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

        # Req 11 & 15: After payment succeeds, buyer's offer is completed and competing offer is now rejected
        buyer_sent_after_pay = buyer_client.get("/api/offers/sent").json()["items"][0]
        assert buyer_sent_after_pay["status"] == "completed"
        outsider_sent_after_pay = outsider_client.get("/api/offers/sent").json()["items"][0]
        assert outsider_sent_after_pay["status"] == "rejected"

        # Duplicate payment is prevented (HTTP 409)
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

        # Req 13: Sold listing cannot be deleted
        assert seller_client.delete(f"/api/listings/{listing_id}").status_code == 409

        # PDF Receipt generation and authorization
        outsider_rcpt = outsider_client.get(f"/api/sales/{sale_id}/receipt")
        assert outsider_rcpt.status_code == 403
        assert outsider_client.get(f"/api/sales/{sale_id}").status_code == 403

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

        # Seller can also download the exact same receipt
        seller_rcpt = seller_client.get(f"/api/sales/{sale_id}/receipt")
        assert seller_rcpt.status_code == 200
        assert seller_rcpt.headers["content-type"] == "application/pdf"
        assert seller_rcpt.content.startswith(b"%PDF")


def test_offer_reject_and_buyer_cancel_and_soft_archive_listing(client, db_session):
    """Reqs 13 & 15: Pending -> Cancelled by buyer, Pending -> Rejected by seller, and soft-archive on delete."""
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

        # Deleting a listing with only cancelled/rejected offers soft-archives it without breaking FKs
        del_res = seller_client.delete(f"/api/listings/{listing_id}")
        assert del_res.status_code == 200
        assert buyer_client.get(f"/api/listings/{listing_id}").status_code == 404


def test_registration_approval_and_deactivation_request_workflows(client, db_session):
    """Reqs 3, 6, 7, 8, 18, 23: Pending student registration approval, deactivation obligation checks, and admin overview."""
    data = _seed_marketplace_users(db_session)
    pw = data["password"]
    listing_id = data["listing1"].listing_id

    with (
        TestClient(fastapi_app) as student_client,
        TestClient(fastapi_app),
        TestClient(fastapi_app) as admin_client,
    ):
        # 1. New student registers -> status is 'pending', not logged in automatically
        reg_res = student_client.post(
            "/api/auth/register",
            json={
                "f_name": "Kiran",
                "l_name": "Rao",
                "email": "kiran.rao@iitdh.ac.in",
                "password": "NewStudentPass123!",
                "phone_no": "9123456789",
                "gender": "Female",
                "terms_accepted": True,
            },
        )
        assert reg_res.status_code == 201
        reg_user = reg_res.json()
        assert reg_user["account_status"] == "pending"
        new_user_id = reg_user["user_id"]

        # Not automatically logged in
        assert student_client.get("/api/auth/me").status_code == 401

        # Pending student cannot log in before admin approval
        early_login = student_client.post(
            "/api/auth/login",
            json={"email": "kiran.rao@iitdh.ac.in", "password": "NewStudentPass123!"},
        )
        assert early_login.status_code == 403
        assert "pending administrator approval" in early_login.json()["error"]["message"].lower()

        # 2. Admin logs in as testadmin63@iitdh.ac.in and views overview + pending registrations
        adm_login = admin_client.post(
            "/api/auth/login",
            json={"email": "testadmin63@iitdh.ac.in", "password": pw},
        )
        assert adm_login.status_code == 200

        overview = admin_client.get("/api/admin/overview")
        assert overview.status_code == 200
        assert overview.json()["pending_registrations"] >= 1

        pending_regs = admin_client.get("/api/admin/registrations?status=pending")
        assert pending_regs.status_code == 200
        assert any(r["user_id"] == new_user_id for r in pending_regs.json()["items"])

        # 3. Admin approves registration -> student can now log in
        approve_res = admin_client.patch(
            f"/api/admin/registrations/{new_user_id}",
            json={"action": "approve", "admin_comment": "Verified IITDh ID"},
        )
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "approved"

        ok_login = student_client.post(
            "/api/auth/login",
            json={"email": "kiran.rao@iitdh.ac.in", "password": "NewStudentPass123!"},
        )
        assert ok_login.status_code == 200

        # 4. Direct self-deactivation via DELETE /api/auth/me is blocked (Req 6)
        direct_del = student_client.delete("/api/auth/me")
        assert direct_del.status_code == 403

        # 5. Student submits an offer on listing1 and also submits a deactivation request
        offer_res = student_client.post(
            "/api/offers",
            json={"listing_id": listing_id, "offered_price": "550.00"},
        )
        assert offer_res.status_code == 201
        active_offer_id = offer_res.json()["offer_id"]

        deact_req = student_client.post(
            "/api/account/deactivation-request",
            json={"reason": "Graduating at the end of the semester."},
        )
        assert deact_req.status_code == 201
        req_id = deact_req.json()["request_id"]
        assert deact_req.json()["status"] == "pending"

        # Student can view their own deactivation request status
        my_reqs = student_client.get("/api/account/deactivation-request/me")
        assert my_reqs.status_code == 200
        assert my_reqs.json()["total"] == 1

        # 6. Admin attempts to approve deactivation while student has a pending offer -> blocked (HTTP 409)
        adm_deacts = admin_client.get("/api/admin/deactivation-requests?status=pending")
        assert adm_deacts.status_code == 200
        req_item = next(r for r in adm_deacts.json()["items"] if r["request_id"] == req_id)
        assert len(req_item["blocking_reasons"]) >= 1

        blocked_approve = admin_client.patch(
            f"/api/admin/deactivation-requests/{req_id}",
            json={"action": "approve"},
        )
        assert blocked_approve.status_code == 409

        # 7. Student cancels their pending offer -> Admin can now approve deactivation
        student_client.patch(f"/api/offers/{active_offer_id}", json={"status": "cancelled"})

        approved_deact = admin_client.patch(
            f"/api/admin/deactivation-requests/{req_id}",
            json={"action": "approve", "admin_comment": "All obligations cleared."},
        )
        assert approved_deact.status_code == 200
        assert approved_deact.json()["status"] == "approved"

        # Deactivated student can no longer log in
        deact_login = student_client.post(
            "/api/auth/login",
            json={"email": "kiran.rao@iitdh.ac.in", "password": "NewStudentPass123!"},
        )
        assert deact_login.status_code == 403


def test_listings_crud_image_validation_cart_favourites_and_categories(client, db_session, tmp_path, monkeypatch):
    """Reqs 5, 8, 16, 19: Listings CRUD, image format/size/count validation, cart, favourites, and category rename/delete."""
    monkeypatch.setenv("PEERMART_UPLOAD_DIR", str(tmp_path))
    data = _seed_marketplace_users(db_session)
    pw = data["password"]

    with (
        TestClient(fastapi_app) as seller_client,
        TestClient(fastapi_app) as buyer_client,
        TestClient(fastapi_app) as admin_client,
    ):
        seller_client.post("/api/auth/login", json={"email": data["seller"].email, "password": pw})
        buyer_client.post("/api/auth/login", json={"email": data["buyer"].email, "password": pw})
        admin_client.post("/api/auth/login", json={"email": data["admin"].email, "password": pw})

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

        # Reject invalid non-JPEG/PNG image format
        bad_img = seller_client.post(
            "/api/listing-images",
            data={"listing_id": str(new_listing_id), "display_order": "1"},
            files={"file": ("exploit.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        assert bad_img.status_code == 422

        # Seller uploads 2 valid PNG images via multipart/form-data
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

        # Seller deletes listing with zero offers
        deleted = seller_client.delete(f"/api/listings/{new_listing_id}")
        assert deleted.status_code == 200
        assert buyer_client.get(f"/api/listings/{new_listing_id}").status_code == 404

        # Admin category create, rename, and safe delete
        new_cat = admin_client.post("/api/categories", json={"category_name": "Musical Instruments"})
        assert new_cat.status_code == 201
        cat_id = new_cat.json()["category_id"]

        renamed_cat = admin_client.patch(f"/api/categories/{cat_id}", json={"category_name": "Music & Audio Gear"})
        assert renamed_cat.status_code == 200
        assert renamed_cat.json()["category_name"] == "Music & Audio Gear"

        # Category with existing listings cannot be deleted (HTTP 409)
        assert admin_client.delete(f"/api/categories/{data['books'].category_id}").status_code == 409
        # Empty category can be safely deleted
        assert admin_client.delete(f"/api/categories/{cat_id}").status_code == 200


def test_56_listings_and_122_supabase_images_dataset_preserved():
    """Verify finalized 56-listing and 122-Supabase-image dataset files are intact."""
    import json
    from pathlib import Path

    from import_final_dataset import load_products

    products = load_products()
    assert len(products) == 56

    manifest_path = Path(__file__).resolve().parent.parent / "dataset" / "supabase_images_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    total_images = (
        len(manifest)
        if isinstance(manifest, list)
        else sum(len(item.get("images", [])) for item in manifest.get("products", []))
    )
    assert total_images == 122
