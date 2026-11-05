import os

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


def test_mysql_database_integration():
    database_url = os.getenv("TEST_DATABASE_URL")

    if not database_url:
        pytest.skip("TEST_DATABASE_URL is not configured")

    parsed_url = make_url(database_url)

    assert parsed_url.get_backend_name() == "mysql"
    assert parsed_url.database == "peermart_test", (
        "Integration tests must use the isolated peermart_test database"
    )

    engine = create_engine(database_url, pool_pre_ping=True)

    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar_one()
            assert result == 1

        tables = set(inspect(engine).get_table_names())

        expected_tables = {
            "users",
            "categories",
            "listings",
            "listing_images",
            "favourites",
            "cart_items",
            "offers",
            "sales",
        }

        assert expected_tables.issubset(tables)
    finally:
        engine.dispose()
