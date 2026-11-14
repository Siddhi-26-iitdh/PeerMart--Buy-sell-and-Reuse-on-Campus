# PeerMart – Buy, Sell and Reuse on Campus

**Course:** CS602C – Advanced Software Development Laboratory (Indian Institute of Technology Dharwad)
**GitHub Repository:** `https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus`

## Project Overview

PeerMart is an AI-enabled campus marketplace that lets IIT Dharwad students buy, sell, and reuse second-hand items—such as bicycles, textbooks, scientific calculators, electronics, hostel essentials, and sports gear—within a verified `@iitdh.ac.in` community.

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Vite, React Router 7, Nginx (`client_max_body_size 25m`)
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2
- **Database & Migrations:** MySQL 8.0, Alembic (`alembic upgrade head` through revision `8c9d0e1f2a3b`)
- **Authentication & Security:** Session-based HTTP-only cookies (`SessionMiddleware`), Argon2 salted password hashing (`argon2-cffi`), role-based access control (`student`, `admin`), and strict ownership enforcement
- **AI Natural-Language Search:** Groq API (`llama-3.3-70b-versatile`) with structured JSON extraction, word-boundary relevance matching, rate limiting, prompt-injection protection, and deterministic keyword-search fallback
- **Image Storage:** Supabase Storage (122 hosted product images across 56 listings) + validated local multipart uploads (`/api/uploads`, 2–5 JPEG/PNG images per listing, max 5 MB each)
- **Testing & CI:** Pytest (`>= 70%` backend coverage), Playwright E2E tests, Ruff linting, GitHub Actions CI

## Key Features & Workflows

1. **Seller Email Privacy:** Seller email addresses are never exposed in public listing APIs, search results, or AI search responses. A seller's `@iitdh.ac.in` email is revealed only after an authenticated buyer submits a valid offer for that specific listing (and in the post-payment PDF receipt).
2. **Admin-Approved Student Registration:** New student registrations (`POST /api/auth/register`) start in `pending` status (`account_requests`) without auto-login. Once the administrator (`testadmin63@iitdh.ac.in`) approves the registration in the Admin Dashboard, the student can sign in. All 19 seeded demo student accounts and `testadmin63@iitdh.ac.in` are active by default.
3. **Admin-Approved Account Deactivation with Obligation Checks:** Students cannot directly delete their accounts (`DELETE /api/auth/me` is disabled). Instead, students submit a Deactivation Request from their Profile page (`POST /api/account/deactivation-request`). The backend blocks approval (`HTTP 409`) if the student has any active buyer offers, active seller negotiations, accepted offers awaiting payment, or reserved listings. Upon approval, personal fields (`phone_no`, `gender`) are anonymized while historical transaction records remain intact.
4. **Multi-Offer Negotiation & Competing Offer Preservation:** Multiple buyers can submit offers on the same available listing. When the seller accepts one offer, that offer becomes `accepted` and the listing becomes `reserved`, while other buyers' competing offers remain `pending` (not rejected prematurely). Competing offers are automatically rejected only after the accepted buyer completes simulated payment. If the payment fails or is cancelled, the listing reservation is released back to `available`.
5. **PeerMart Demo Payment Gateway & PDF Receipt Generation:** Accepted buyers complete checkout in a clearly labeled **Demo Payment Gateway (No Real Money)** modal supporting simulated success, simulated failure, and cancellation. Successful payment atomically records the `Sale`, marks the offer `completed` and listing `sold`, and unlocks a downloadable single-page IIT Dharwad PeerMart PDF receipt (`GET /api/sales/{sale_id}/receipt`).
6. **Complete 5-Section Admin Dashboard (`testadmin63@iitdh.ac.in`):**
   - **Overview:** Live database metrics for users, pending registrations, deactivation requests, listings by status, offers, completed sales, categories, and contact messages.
   - **Users & Requests:** Search/filter users, approve/reject pending registrations, review deactivation requests with obligation checks, and activate/deactivate accounts with confirmation modals.
   - **Listings Moderation:** Filter listings by keyword/status, view seller email and created date, and moderate status (blocking deletion when offers/transactions exist).
   - **Categories:** Create, rename (`PATCH /api/categories/{id}`), and safely delete categories (blocked when listings exist).
   - **Contact Messages:** Filter Help Centre submissions by category (`General Inquiry`, `Account Issue`, `Listing Report`, `Deactivation Request`) and status (`new`, `in_progress`, `resolved`), and send admin replies visible in the student's Help Centre history.

## Environment Variables

Copy `.env.example` to `.env` in the repository root before starting Docker Compose:

| Variable | Description | Default / Example |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | MySQL 8 root password | `rootpass` |
| `MYSQL_DATABASE` | MySQL database name | `peermart` |
| `MYSQL_USER` | MySQL application user | `peermart` |
| `MYSQL_PASSWORD` | MySQL application password | `peermart` |
| `DATABASE_URL` | SQLAlchemy MySQL connection string | `mysql+pymysql://peermart:peermart@db:3306/peermart` |
| `PEERMART_SESSION_SECRET` | Secret key for signing session cookies | Set a strong random string |
| `PEERMART_DEMO_PASSWORD` | Initial password used only when seeding an empty DB | Set before first run |
| `GROQ_API_KEY` | Backend-only Groq API key for AI Search | `gsk_...` (optional; falls back to keyword parser if unset) |
| `GROQ_MODEL` | Groq model for structured JSON extraction | `llama-3.3-70b-versatile` |

## Quick Start (Docker Compose on WSL Ubuntu / Linux)

```bash
cp .env.example .env
# Edit .env to set PEERMART_DEMO_PASSWORD and optional GROQ_API_KEY
docker compose up --build -d
```

- **Frontend Web App:** `http://localhost:8080`
- **Backend API & OpenAPI Docs:** `http://localhost:8000/docs`
- **Seeded Demo Accounts:**
  - **Admin:** `testadmin63@iitdh.ac.in` (password: value of `PEERMART_DEMO_PASSWORD`)
  - **Students:** `testuser01@iitdh.ac.in` through `testuser19@iitdh.ac.in` (password: value of `PEERMART_DEMO_PASSWORD`)
  - **Dataset:** 8 categories, 56 listings, and 122 Supabase product images (`backend/dataset/supabase_images_manifest.json`)

## Running Tests & Linting

```bash
# Backend Ruff lint + Alembic migration + Pytest with >= 70% coverage
docker compose exec backend ruff check app/ tests/ alembic/ seed.py
docker compose exec backend pytest tests/ -v --cov=app --cov-report=term-missing --cov-fail-under=70

# Frontend TypeScript & Vite production build
cd frontend && npm ci && npm run build

# Playwright E2E tests
cd frontend && PEERMART_DEMO_PASSWORD="<your-demo-password>" npx playwright test
```

## Team Members

- **CS26MT007** – Siddhi Avhad
- **CS26MT008** – Isha Bhardwaj
- **CS26MT013** – Radhemohan Yadav

**Project Guide:** Prof. Gayathri A.
**Course:** CS602C – Advanced Software Development Laboratory
