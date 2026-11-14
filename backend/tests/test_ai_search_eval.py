import json
from pathlib import Path

import pytest

from app.services.ai_search_service import (
    fallback_extract_filters,
    query_cache,
    rate_limiter,
)

EVAL_PATH = Path(__file__).resolve().parent.parent / "dataset" / "ai_search_eval_queries.json"
EVAL_DATA = json.loads(EVAL_PATH.read_text(encoding="utf-8"))

ALL_CASES = (
    [("genuine", item) for item in EVAL_DATA["genuine"]]
    + [("injection", item) for item in EVAL_DATA["injection"]]
    + [("invalid", item) for item in EVAL_DATA["invalid"]]
)


@pytest.fixture(autouse=True)
def _reset_limiter_and_env(monkeypatch):
    rate_limiter.reset()
    query_cache.clear()
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setenv("AI_SEARCH_RATE_LIMIT_PER_MIN", "100")
    yield
    rate_limiter.reset()
    query_cache.clear()


@pytest.mark.parametrize(
    ("group", "case"),
    ALL_CASES,
    ids=[f"{group}-{case['id']}" for group, case in ALL_CASES],
)
def test_ai_search_50_eval_queries(client, group, case):
    if case.get("null_payload"):
        response = client.post("/api/ai-search", json=None)
    elif case.get("missing_field"):
        response = client.post("/api/ai-search", json={})
    else:
        query = case["query"]
        if case.get("repeat_words"):
            query = " ".join(["textbook"] * int(case["repeat_words"]))
        elif case.get("repeat_chars"):
            query = "a" * int(case["repeat_chars"])
        elif case.get("null_byte"):
            query = "textbook\x00"
            response = client.post("/api/ai-search", json={"query": query})
            assert response.status_code in (400, 422)
            return
        response = client.post("/api/ai-search", json={"query": query})

    assert response.status_code == case["expected_status"], (
        f"{group} {case['id']} returned {response.status_code}: {response.text}"
    )


def test_ai_search_genuine_accuracy_at_least_90_percent():
    """Req 21: Genuine query category/filter extraction accuracy must be >= 90%."""
    matched = 0
    for item in EVAL_DATA["genuine"]:
        filters = fallback_extract_filters(item["query"])
        expected_cat = item.get("expected_category")
        if expected_cat is None or filters.category == expected_cat:
            matched += 1
    accuracy = matched / len(EVAL_DATA["genuine"])
    assert accuracy >= 0.90, f"Expected >= 90% genuine accuracy, got {accuracy:.1%}"
