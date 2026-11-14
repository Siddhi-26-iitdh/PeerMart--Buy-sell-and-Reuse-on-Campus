#!/bin/sh
set -eu

echo "=== Applying database migrations ==="
alembic upgrade head

echo "=== Checking demo users ==="
python - <<'PY'
from sqlalchemy import func, select
from app.database import SessionLocal
from app.models.user import User
from seed import seed

with SessionLocal() as db:
    count = db.scalar(select(func.count()).select_from(User)) or 0

if count == 0:
    print("Fresh database: creating demo users")
    seed()
else:
    print(f"Existing database: {count} users; skipping user seed")
PY

echo "=== Checking demo catalogue ==="
python initialize_demo.py

echo "=== Starting FastAPI ==="
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
