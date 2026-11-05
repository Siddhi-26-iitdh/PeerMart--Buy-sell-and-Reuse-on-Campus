from decimal import Decimal

from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User


def create_sample_listings(db_session):
    seller = User(
        f_name="Test",
        l_name="Seller",
        email="seller@example.com",
        password_hash="test-hash",
    )

    books = Category(category_name="Books")
    cycles = Category(category_name="Cycles")

    db_session.add_all([seller, books, cycles])
    db_session.flush()

    db_session.add_all([
        Listing(
            seller_id=seller.user_id,
            category_id=books.category_id,
            title="Python Textbook",
            description="Used programming textbook",
            price=Decimal("500.00"),
            item_condition="used",
            status="available",
        ),
        Listing(
            seller_id=seller.user_id,
            category_id=cycles.category_id,
            title="Mountain Bicycle",
            description="Campus bicycle",
            price=Decimal("3000.00"),
            item_condition="used",
            status="available",
        ),
        Listing(
            seller_id=seller.user_id,
            category_id=books.category_id,
            title="Engineering Notebook",
            description="Unused notebook",
            price=Decimal("100.00"),
            item_condition="new",
            status="sold",
        ),
    ])

    db_session.commit()
    return books.category_id, cycles.category_id


def test_list_all_listings(client, db_session):
    create_sample_listings(db_session)

    response = client.get("/api/listings")

    assert response.status_code == 200
    assert response.json()["total"] == 3
    assert len(response.json()["items"]) == 3


def test_filter_by_category(client, db_session):
    books_id, _ = create_sample_listings(db_session)

    response = client.get(f"/api/listings?category_id={books_id}")

    assert response.status_code == 200
    assert response.json()["total"] == 2
    assert all(
        item["category_id"] == books_id
        for item in response.json()["items"]
    )


def test_filter_by_max_price(client, db_session):
    create_sample_listings(db_session)

    response = client.get("/api/listings?max_price=500")

    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_filter_by_status(client, db_session):
    create_sample_listings(db_session)

    response = client.get("/api/listings?status=sold")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "Engineering Notebook"


def test_invalid_price_range(client):
    response = client.get(
        "/api/listings?min_price=5000&max_price=1000"
    )

    assert response.status_code == 400


def test_get_nonexistent_listing(client):
    response = client.get("/api/listings/99999")

    assert response.status_code == 404


def test_invalid_listing_page(client):
    response = client.get("/api/listings?page=0")

    assert response.status_code == 422
