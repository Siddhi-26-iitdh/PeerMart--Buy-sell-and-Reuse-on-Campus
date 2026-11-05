def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_categories(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_category_detail(client):
    response = client.get("/api/categories/1")
    assert response.status_code == 200
    assert response.json()["category_name"] == "Books"


def test_listings(client):
    response = client.get("/api/listings")
    assert response.status_code == 200
    assert response.json()["total"] == 3


def test_pagination(client):
    first = client.get("/api/listings?page=1&size=2").json()
    second = client.get("/api/listings?page=2&size=2").json()

    assert len(first["items"]) == 2
    assert len(second["items"]) == 1
    assert first["items"][0]["listing_id"] != second["items"][0]["listing_id"]


def test_category_filter(client):
    response = client.get("/api/listings?category_id=1")
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_price_filter(client):
    response = client.get("/api/listings?max_price=400")
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_listing_detail(client):
    response = client.get("/api/listings/1")
    assert response.status_code == 200
    assert response.json()["title"] == "Engineering Textbook"


def test_listing_not_found(client):
    response = client.get("/api/listings/999999")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "HTTP_404"


def test_invalid_page_size(client):
    response = client.get("/api/listings?size=101")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_invalid_price_range(client):
    response = client.get("/api/listings?min_price=1000&max_price=100")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "HTTP_400"


def test_no_matching_listings(client):
    response = client.get("/api/listings?max_price=1")
    assert response.status_code == 200
    assert response.json()["items"] == []
