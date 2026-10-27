from fastapi import FastAPI

from app.routers.categories import router as categories_router
from app.routers.users import router as users_router

from app.routers.listings import router as listings_router


app = FastAPI(
    title="PeerMart API",
    description="Campus marketplace backend for buying, selling, and reusing products.",
    version="0.1.0",
)

app.include_router(users_router)
app.include_router(categories_router)
app.include_router(listings_router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "PeerMart"}