from app.models.category import Category


def test_list_categories(client, db_session):
    db_session.add_all([
        Category(category_name="Books"),
        Category(category_name="Electronics"),
    ])
    db_session.commit()

    response = client.get("/api/categories")

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    assert data["items"][0]["category_name"] == "Books"
    assert data["items"][1]["category_name"] == "Electronics"


def test_get_existing_category(client, db_session):
    category = Category(category_name="Cycles")
    db_session.add(category)
    db_session.commit()

    response = client.get(f"/api/categories/{category.category_id}")

    assert response.status_code == 200
    assert response.json()["category_name"] == "Cycles"


def test_get_nonexistent_category(client):
    response = client.get("/api/categories/99999")

    assert response.status_code == 404


def test_invalid_page_number(client):
    response = client.get("/api/categories?page=0")

    assert response.status_code == 422


def test_invalid_page_size(client):
    response = client.get("/api/categories?size=100")

    assert response.status_code == 422
