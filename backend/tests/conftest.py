import os
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app as fastapi_app
import app.models  # noqa: F401
from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User


TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "mysql+pymysql://peermart:peermart@localhost:3306/peermart_test",
)

# Safety: never run tests against the production database.
assert TEST_DATABASE_URL.split("?")[0].endswith("/peermart_test")

test_engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True)
TestSession = sessionmaker(bind=test_engine, autoflush=False)


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestSession()

    try:
        seller = User(
            f_name="Test",
            l_name="Seller",
            email="seller@test.local",
            password_hash="test-only-hash",
            role="student",
            account_status="active",
        )
        books = Category(category_name="Books")
        electronics = Category(category_name="Electronics")

        db.add_all([seller, books, electronics])
        db.flush()

        db.add_all([
            Listing(
                seller_id=seller.user_id,
                category_id=books.category_id,
                title="Engineering Textbook",
                description="Used textbook",
                price=Decimal("350.00"),
                item_condition="good",
                status="available",
            ),
            Listing(
                seller_id=seller.user_id,
                category_id=electronics.category_id,
                title="Scientific Calculator",
                description="Working calculator",
                price=Decimal("650.00"),
                item_condition="good",
                status="available",
            ),
            Listing(
                seller_id=seller.user_id,
                category_id=books.category_id,
                title="Physics Notes",
                description="Study notes",
                price=Decimal("150.00"),
                item_condition="new",
                status="available",
            ),
        ])
        db.commit()

        def override_db():
            yield db

        fastapi_app.dependency_overrides[get_db] = override_db

        with TestClient(fastapi_app) as test_client:
            yield test_client

    finally:
        fastapi_app.dependency_overrides.clear()
        db.close()
