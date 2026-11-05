# PeerMart Milestone 4 — CI Verification

## GitHub Actions
- Workflow: Backend Tests
- File: .github/workflows/backend-tests.yml
- Python version: 3.12
- Database: MySQL 8.0
- Linting: Ruff
- Database migrations: Alembic
- Testing: pytest
- Coverage tool: pytest-cov
- Minimum coverage: 60%

## Verification Results
- Categories API: HTTP 200
- Listings API: HTTP 200
- React frontend: HTTP 200
- Docker MySQL container: Healthy
- FastAPI container: Running
- React frontend container: Running
- Latest verified commit: 2c7a8b3
- Latest GitHub commit check: Passed

## Test Evidence
- 25 API tests passed in Siddhi's local test run.
- Reported local coverage: 88.48%.
- GitHub Actions runs Ruff, MySQL tests, and coverage checks.

## Branch Protection
- Direct pushes to main are blocked.
- Changes must be submitted through pull requests.
- PR #7 was merged into main.

## Demo
The team will provide the PeerMart demonstration video separately.
