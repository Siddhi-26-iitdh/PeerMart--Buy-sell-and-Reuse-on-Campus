from fastapi import FastAPI

app = FastAPI(
    title="PeerMart API",
    description="Campus marketplace backend for buying, selling, and reusing products.",
    version="0.1.0",
)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "PeerMart"}
