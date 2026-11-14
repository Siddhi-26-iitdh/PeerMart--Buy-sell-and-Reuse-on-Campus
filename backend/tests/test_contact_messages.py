from decimal import Decimal

from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User
from app.passwords import hash_password


def _create_users_and_listing(db_session):
    student = User(
        f_name="Student",
        l_name="One",
        email="student1@iitdh.ac.in",
        password_hash=hash_password("TestPass123!"),
        role="student",
        account_status="active",
    )
    admin = User(
        f_name="Campus",
        l_name="Admin",
        email="testadmin63@iitdh.ac.in",
        password_hash=hash_password("AdminPass123!"),
        role="admin",
        account_status="active",
    )
    cat = Category(category_name="Books & Study Materials")
    db_session.add_all([student, admin, cat])
    db_session.flush()

    listing = Listing(
        seller_id=student.user_id,
        category_id=cat.category_id,
        title="Algorithms Textbook",
        description="CLRS 4th edition",
        price=Decimal("450.00"),
        item_condition="used",
        status="available",
    )
    db_session.add(listing)
    db_session.commit()
    return student, admin, listing


def test_contact_admin_requires_auth(client):
    response = client.post(
        "/api/contact-messages",
        json={"subject": "Need help", "message": "Cannot view listing"},
    )
    assert response.status_code == 401


def test_contact_admin_submit_and_admin_workflow(client, db_session):
    student, admin, listing = _create_users_and_listing(db_session)

    login_res = client.post(
        "/api/auth/login",
        json={"email": student.email, "password": "TestPass123!"},
    )
    assert login_res.status_code == 200

    bad_listing = client.post(
        "/api/contact-messages",
        json={
            "category": "Listing Report",
            "subject": "Missing item",
            "message": "Listing ID does not exist",
            "listing_id": 99999,
        },
    )
    assert bad_listing.status_code == 404

    created = client.post(
        "/api/contact-messages",
        json={
            "category": "Listing Report",
            "subject": "Question about listing",
            "message": "Is this listing still verified on campus?",
            "listing_id": listing.listing_id,
        },
    )
    assert created.status_code == 201
    created_data = created.json()
    assert created_data["category"] == "Listing Report"
    assert created_data["listing_id"] == listing.listing_id
    assert created_data["listing_title"] == "Algorithms Textbook"
    assert created_data["status"] == "new"

    my_msgs = client.get("/api/contact-messages/me")
    assert my_msgs.status_code == 200
    assert my_msgs.json()["total"] == 1

    forbidden = client.get("/api/admin/contact-messages")
    assert forbidden.status_code == 403

    admin_login = client.post(
        "/api/auth/login",
        json={"email": admin.email, "password": "AdminPass123!"},
    )
    assert admin_login.status_code == 200

    admin_list = client.get("/api/admin/contact-messages?status=new&category=Listing%20Report")
    assert admin_list.status_code == 200
    assert admin_list.json()["total"] == 1

    msg_id = created_data["message_id"]
    in_prog = client.patch(
        f"/api/admin/contact-messages/{msg_id}/status",
        json={"status": "in_progress", "admin_reply": "Checking with the seller."},
    )
    assert in_prog.status_code == 200
    assert in_prog.json()["status"] == "in_progress"
    assert in_prog.json()["admin_reply"] == "Checking with the seller."

    updated = client.patch(
        f"/api/admin/contact-messages/{msg_id}/status",
        json={"status": "resolved", "admin_reply": "Verified listing details on campus."},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "resolved"
    assert updated.json()["admin_reply"] == "Verified listing details on campus."
