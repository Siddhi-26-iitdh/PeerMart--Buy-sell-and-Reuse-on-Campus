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
- **AI Natural-Language Search:** Groq API (`openai/gpt-oss-20b`) with structured JSON extraction, word-boundary relevance matching, rate limiting, prompt-injection protection, and deterministic keyword-search fallback
- **Image Storage:** Supabase Storage (122 hosted product images across 56 listings) + validated local multipart uploads (`/api/uploads`, 2–5 JPEG/PNG images per listing, max 5 MB each)
- **Testing & CI:** Pytest (88.48% recorded backend line coverage (CI artifact)), Playwright E2E tests, Ruff linting, GitHub Actions CI

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

Copy `.env.example` to `.env` in the repository root before starting Docker Compose. The provided `.env.example` contains older Gemini placeholders; replace those with the Groq settings shown below:

| Variable | Description | Default / Example |
|---|---|---|
| `DB_ROOT_PASSWORD` | MySQL 8 root password used by Compose | `rootpass` (development only) |
| `DB_PASSWORD` | MySQL application password used by Compose | `peermart` (development only) |
| `PEERMART_SESSION_SECRET` | Secret key for signing session cookies | Set a strong random string |
| `PEERMART_DEMO_PASSWORD` | Initial password used only when seeding an empty DB | Set before first run |
| `GROQ_API_KEY` | Backend-only Groq API key for AI Search | `gsk_...` (optional; falls back to keyword parser if unset) |
| `GROQ_MODEL` | Groq model for structured JSON extraction | `openai/gpt-oss-20b` |

## How to Run PeerMart Locally

PeerMart is containerized using Docker Compose. The complete application includes a React frontend, FastAPI backend, and MySQL database. Users do not need to install Python, Node.js, or MySQL separately.

### Prerequisites

- Git
- Docker Desktop (Windows/macOS) or Docker Engine with Compose (Linux)
- An internet connection for downloading Docker images and application dependencies
- A Groq API key (optional, for AI-powered search)

### Step 1: Clone the Repository

Open a terminal and run:

```bash
git clone https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus.git
cd PeerMart--Buy-sell-and-Reuse-on-Campus
```

### Step 2: Configure Environment Variables

Create the environment configuration file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and configure the required variables:

```env
DB_ROOT_PASSWORD=your_root_password
DB_PASSWORD=your_database_password
PEERMART_SESSION_SECRET=your_long_random_secret
PEERMART_DEMO_PASSWORD=your_demo_password

GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
```

The Groq API key is optional. Without it, PeerMart uses its deterministic keyword-search fallback.

### Step 3: Start the Application

Make sure Docker is running, then execute:

```bash
docker compose up --build -d
```

Docker Compose builds and starts the application services. The backend initializes the database and loads the demonstration dataset during first-time setup.

### Step 4: Open the Website

| Service | URL |
|---|---|
| **PeerMart Website** | http://localhost:8444 |
| **FastAPI Swagger Documentation** | http://localhost:8000/docs |

### Step 5: Login Using Demo Accounts

| Role | Email | Password |
|---|---|---|
| Administrator | `testadmin63@iitdh.ac.in` | Value of `PEERMART_DEMO_PASSWORD` |
| Student | `testuser01@iitdh.ac.in` | Value of `PEERMART_DEMO_PASSWORD` |

The initial dataset contains 20 fictional user accounts, 56 listings, and 122 product images.

### Useful Docker Commands

Check running containers:

```bash
docker compose ps
```

View application logs:

```bash
docker compose logs -f
```

Stop the application:

```bash
docker compose down
```

Restart the application:

```bash
docker compose up -d
```

**Note:** Do not use `docker compose down -v` unless you intentionally want to delete the database volume and its stored data.

### Important Notes

- Docker must be running before starting PeerMart.
- The application runs locally and does not require public deployment.
- AI-powered search requires a valid Groq API key; the remaining marketplace features can work without it.
- Payments are simulated for demonstration purposes. No real financial transactions occur.
- Replace all development passwords and session secrets before deploying publicly.

## Quick Start (Docker Compose on WSL Ubuntu / Linux)

```bash
cp .env.example .env
# Set DB_ROOT_PASSWORD, DB_PASSWORD, PEERMART_SESSION_SECRET,
# PEERMART_DEMO_PASSWORD, and optionally GROQ_API_KEY and GROQ_MODEL in .env
docker compose up --build -d
```

- **Frontend Web App:** `http://localhost:8444`
- **Backend API & OpenAPI Docs:** `http://localhost:8000/docs`
- **Seeded Demo Accounts:**
  - **Admin:** `testadmin63@iitdh.ac.in` (password: value of `PEERMART_DEMO_PASSWORD`)
  - **Students:** `testuser01@iitdh.ac.in` through `testuser19@iitdh.ac.in` (password: value of `PEERMART_DEMO_PASSWORD`)
  - **Dataset:** 8 categories, 56 listings, and 122 Supabase product images (`backend/dataset/supabase_images_manifest.json`)

## Running Tests & Linting

```bash
# Backend Ruff lint + Alembic migration + Pytest with >= 70% coverage
cd backend
ruff check app/ tests/ alembic/ seed.py
pytest tests/ -v --cov=app --cov-report=term-missing --cov-fail-under=70

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


## Project Milestones and Submissions

PeerMart was developed through six milestones from 15 October to 19 November 2026. Each milestone introduced new functionality, documentation, testing, and deployment improvements. All six milestones have been completed, and the final project is available in this GitHub repository.

| Milestone | Date | Completed Work | Submission / Evidence |
|---|---|---|---|
| **MS-1** | 15 Oct 2026 | Problem statement, dataset planning, sitemap, user stories, AI feature proposal, and repository setup | [GitHub Repository](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus) |
| **MS-2** | 22 Oct 2026 | Interactive Figma prototype, database design, 3NF ER diagram, relationships, and constraints | [Figma Prototype](https://www.figma.com/make/KSWYKohtv3cIhkfsQnVF4n/PeerMart) · [ER Diagram](MS2_ER_Diagram.pdf) |
| **MS-3** | 29 Oct 2026 | FastAPI backend, MySQL database, eight related tables, Alembic migrations, seed dataset, and OpenAPI specification | [OpenAPI YAML](docs/openapi.yaml) · [PR #1](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/1) · [PR #2](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/2) |
| **MS-4** | 5 Nov 2026 | Running frontend/backend, Docker integration, unit and integration testing, GitHub Actions, and coverage verification | [GitHub Actions](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/actions) · [Coverage Report](docs/coverage.xml) |
| **MS-5** | 12 Nov 2026 | Authentication, marketplace workflows, AI search, guardrails, evaluation, admin features, and end-to-end testing | [MS-5 Deliverables](MS5_Deliverables/) |
| **MS-6** | 19 Nov 2026 | Final presentation, live demonstration, individual viva, final report, documentation, and project integration | [MS-6 Final Deliverables](MS6_Deliverables/) · [PR #27](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/27) |

**Final submission:** The `MS6_Deliverables/` directory contains the final project presentation (`.pptx`) and final project report (`.pdf`). Supporting technical documentation, including the API contract, ER diagram, AI usage declaration, and test coverage report, is available in the repository.

## MS-6 Final Submission and Design References (19 November 2026)

- **Final presentation and report:** Stored in the team's Google Drive folder `MS6_Final_Deliverables` (PPT and Final Report). A shareable Drive URL has not been provided here.
- **Figma prototype:** [PeerMart interactive prototype](https://www.figma.com/make/KSWYKohtv3cIhkfsQnVF4n/PeerMart?t=Lbxom9HP25ODrPnB-20&fullscreen=1)
- **ER diagram:** [MS-2 ER diagram](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/blob/main/MS2_ER_Diagram.pdf)
- **OpenAPI contract:** [docs/openapi.yaml](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/blob/main/docs/openapi.yaml)
- **Architecture report:** [MS-5 architecture](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/blob/main/MS5_Deliverables/MS5_PeerMart_Architecture_Report.pdf)
- **AI usage declaration:** [AI_USAGE.md](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/blob/main/AI_USAGE.md)
- **CI coverage evidence:** [docs/coverage.xml](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/blob/main/docs/coverage.xml) and [GitHub Actions](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/actions)
- **All merged pull requests:** [GitHub pull requests](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pulls?q=is%3Apr+state%3Aclosed)

### Final dataset and evaluation

The project documentation records **8 categories, 56 product listings, 122 images, and 20 fictional user accounts** (19 students and one admin). The AI evaluation dataset contains **50 predefined cases**: 20 genuine queries, 15 prompt-injection attempts and 15 invalid/malformed requests. The automated fallback-mode test checks expected API responses; it does **not** independently measure live Groq semantic accuracy. See [AI_USAGE.md](AI_USAGE.md) for limitations.

### Testing and coverage

The committed CI-generated `docs/coverage.xml` records **384 covered lines out of 434 (88.48% line coverage)**. This is a historical report artifact and is not a claim that the latest commit was rerun. Automated tests include pytest backend checks; the repository also contains browser/E2E test assets.

### Milestone-wise contributions and representative PRs

| Member | Main contributions | Representative PRs |
|---|---|---|
| Siddhi Avhad | Figma/frontend, seed and Docker initialization, API integration tests, marketplace UI/workflows | [#3](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/3), [#6](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/6), [#21](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/21) |
| Isha Bhardwaj | API/OpenAPI design, AI search and guardrails, evaluation dataset, CI/deployment documentation | [#8](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/8), [#16](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/16), [#17](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/17) |
| Radhemohan Yadav | FastAPI/database foundations, authentication and admin workflows, transactions, deployment and MS-6 fixes | [#12](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/12), [#18](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/18), [#24](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/24), [#25](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/25), [#26](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/26) |

**Attribution note:** PR submitter and underlying implementer can differ; milestone reports attribute MS-3 backend work to Radhemohan Yadav and API contract work to Isha Bhardwaj even though PRs [#1](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/1) and [#2](https://github.com/Siddhi-26-iitdh/PeerMart--Buy-sell-and-Reuse-on-Campus/pull/2) were submitted through the repository owner's account.

**Deployment caution:** Change all development default passwords and the session secret before any public deployment. Demo payments are simulated; no real-money gateway is integrated.
