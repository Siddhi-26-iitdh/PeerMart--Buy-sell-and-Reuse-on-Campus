import os

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.ai_search import AISearchRequest, AISearchResponse
from app.services.ai_search_service import (
    DEFAULT_RATE_LIMIT_PER_MIN,
    PromptInjectionError,
    RateLimitExceededError,
    check_prompt_injection,
    interpret_query_with_groq,
    rate_limiter,
    search_listings_by_filters,
)

router = APIRouter(tags=["AI Search"])


def _rate_limit_key(request: Request) -> str:
    user_id = request.session.get("user_id") if hasattr(request, "session") else None
    if user_id is not None:
        return f"user:{user_id}"
    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"


@router.post("/ai-search", response_model=AISearchResponse)
def ai_search(
    payload: AISearchRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        check_prompt_injection(payload.query)
    except PromptInjectionError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PROMPT_INJECTION_DETECTED",
                "message": str(exc),
            },
        ) from exc

    try:
        limit = int(
            os.environ.get(
                "AI_SEARCH_RATE_LIMIT_PER_MIN",
                str(DEFAULT_RATE_LIMIT_PER_MIN),
            )
        )
    except ValueError:
        limit = DEFAULT_RATE_LIMIT_PER_MIN

    try:
        rate_limiter.check(_rate_limit_key(request), limit=max(limit, 1))
    except RateLimitExceededError as exc:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": str(exc),
            },
        ) from exc

    filters, fallback_used, fallback_reason = interpret_query_with_groq(payload.query)
    items = search_listings_by_filters(db, filters)

    return AISearchResponse(
        query=payload.query,
        interpreted_filters=filters,
        fallback_used=fallback_used,
        fallback_reason=fallback_reason,
        total=len(items),
        items=items,
    )
