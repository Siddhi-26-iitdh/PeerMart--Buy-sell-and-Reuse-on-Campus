from decimal import Decimal
import json

import httpx
import pytest

from app.models.category import Category
from app.models.listing import Listing
from app.models.user import User
from app.services.ai_search_service import query_cache, rate_limiter


@pytest.fixture(autouse=True)
def _reset_limiter():
    rate_limiter.reset()
    query_cache.clear()
    yield
    rate_limiter.reset()
    query_cache.clear()


def _seed_listings(db_session):
    seller = User(
        f_name="AI",
        l_name="Seller",
        email="aiseller@iitdh.ac.in",
        password_hash="test-hash",
    )
    books = Category(category_name="Books & Study Materials")
    cycles = Category(category_name="Cycles & Accessories")
    electronics = Category(category_name="Electronics & Gadgets")
    db_session.add_all([seller, books, cycles, electronics])
    db_session.flush()

    db_session.add_all([
        Listing(
            seller_id=seller.user_id,
            category_id=books.category_id,
            title="Engineering Mathematics Textbook",
            description="Used semester 1 textbook in good condition",
            price=Decimal("350.00"),
            item_condition="used",
            status="available",
        ),
        Listing(
            seller_id=seller.user_id,
            category_id=cycles.category_id,
            title="Campus Commuter Bicycle",
            description="Single speed cycle for hostel travel",
            price=Decimal("2500.00"),
            item_condition="used",
            status="available",
        ),
        Listing(
            seller_id=seller.user_id,
            category_id=electronics.category_id,
            title="Wireless Over-ear Headphones",
            description="Brand new unopened headphones",
            price=Decimal("1200.00"),
            item_condition="new",
            status="available",
        ),
        Listing(
            seller_id=seller.user_id,
            category_id=books.category_id,
            title="Removed Book",
            description="Should never appear",
            price=Decimal("100.00"),
            item_condition="used",
            status="removed",
        ),
    ])
    db_session.commit()


def test_ai_search_groq_success(client, db_session, monkeypatch):
    _seed_listings(db_session)
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps({
                                "category": "Books & Study Materials",
                                "keywords": ["textbook"],
                                "min_price": None,
                                "max_price": 500,
                                "condition": "used",
                            })
                        }
                    }
                ]
            }

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(httpx, "Client", FakeClient)

    response = client.post(
        "/api/ai-search",
        json={"query": "used textbook under 500"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fallback_used"] is False
    assert data["interpreted_filters"]["category"] == "Books & Study Materials"
    assert data["interpreted_filters"]["condition"] == "used"
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Engineering Mathematics Textbook"


def test_ai_search_timeout_fallback(client, db_session, monkeypatch):
    _seed_listings(db_session)
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")

    class TimeoutClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def post(self, *args, **kwargs):
            raise httpx.ReadTimeout("timed out")

    monkeypatch.setattr(httpx, "Client", TimeoutClient)

    response = client.post(
        "/api/ai-search",
        json={"query": "used bicycle under 3000"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fallback_used"] is True
    assert "timed out" in data["fallback_reason"].lower()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Campus Commuter Bicycle"


def test_ai_search_missing_key_fallback(client, db_session, monkeypatch):
    _seed_listings(db_session)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)

    response = client.post(
        "/api/ai-search",
        json={"query": "new headphones under 1500"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["fallback_used"] is True
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Wireless Over-ear Headphones"


def test_ai_search_rate_limit(client, db_session, monkeypatch):
    _seed_listings(db_session)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("AI_SEARCH_RATE_LIMIT_PER_MIN", "2")

    assert client.post("/api/ai-search", json={"query": "book"}).status_code == 200
    assert client.post("/api/ai-search", json={"query": "cycle"}).status_code == 200
    blocked = client.post("/api/ai-search", json={"query": "lamp"})
    assert blocked.status_code == 429
