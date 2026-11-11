from app.routers.admin_activity import router as admin_activity_router
from app.routers.admin_listings import router as admin_listings_router
import os

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from starlette.middleware.sessions import SessionMiddleware

from app.errors import http_error, validation_error
from app.routers.auth import router as auth_router
from app.routers.cart_items import router as cart_items_router
from app.routers.categories import router as categories_router
from app.routers.favourites import router as favourites_router
from app.routers.listing_images import router as listing_images_router
from app.routers.listings import router as listings_router
from app.routers.offers import router as offers_router
from app.routers.sales import router as sales_router
from app.routers.users import router as users_router

app = FastAPI(
    title="PeerMart API",
    description="Campus marketplace backend for buying, selling, and reusing products.",
    version="0.1.0",
)

session_secret = os.environ.get("PEERMART_SESSION_SECRET")
if not session_secret or len(session_secret) < 32:
    raise RuntimeError("PEERMART_SESSION_SECRET must contain at least 32 characters")

app.add_middleware(
    SessionMiddleware,
    secret_key=session_secret,
    session_cookie="peermart_session",
    max_age=60 * 60 * 8,
    same_site="lax",
    https_only=os.environ.get("PEERMART_COOKIE_SECURE", "false").lower() == "true",
)

app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(admin_activity_router, prefix="/api")
app.include_router(admin_listings_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(listings_router, prefix="/api")


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "PeerMart"}
app.include_router(listing_images_router, prefix="/api")

app.include_router(cart_items_router, prefix="/api")

app.include_router(favourites_router, prefix="/api")

app.include_router(offers_router, prefix="/api")

app.include_router(sales_router, prefix="/api")

app.add_exception_handler(HTTPException, http_error)
app.add_exception_handler(RequestValidationError, validation_error)
