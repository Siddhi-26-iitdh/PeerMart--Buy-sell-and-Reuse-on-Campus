# AI Usage & AI Search Architecture (`AI_USAGE.md`)

## 1. AI-Powered Natural-Language Search Overview

PeerMart integrates an AI-powered natural-language product search endpoint (`POST /api/ai-search`) that converts student queries (such as `"used engineering textbook under 500"` or `"good cycle below 4000"`) into validated structured filters executed safely against MySQL via SQLAlchemy.

### Architecture & Security Controls

1. **Backend-Only API Key (`GROQ_API_KEY`):**
   - The Groq API key is read exclusively inside `backend/app/services/ai_search_service.py` via `os.getenv("GROQ_API_KEY")`.
   - It is never exposed to the React frontend bundle, browser network requests, or public endpoints.
   - Default Docker Compose model: `openai/gpt-oss-20b` (configurable via `GROQ_MODEL`) using `response_format={"type": "json_object"}` and `temperature=0`.

2. **Input Validation & Prompt-Injection Protection:**
   - Queries are validated for non-empty text, maximum 300 words (`MAX_QUERY_WORDS = 300`), and absence of control characters (`\x00`–`\x1f`).
   - Regex-based prompt-injection guardrails (`INJECTION_PATTERNS`) immediately reject attempts to override system instructions, dump database tables, execute SQL (`UNION SELECT`, `DROP TABLE`, `; --`), or reveal secrets/API keys (`GROQ_API_KEY`, `system prompt`) with `HTTP 400`.
   - All SQL queries use parameterized SQLAlchemy expressions and word-boundary post-filtering (`_matches_word_boundaries`), preventing SQL injection and substring false positives (for example, searching `"big cat"` returns `0` results and never matches `"CAT Exam"` or `"calculator"`).

3. **Pydantic Output Validation & Deterministic Fallback:**
   - Model outputs are validated against `AISearchInterpretedFilters` (`category`, `keywords`, `min_price`, `max_price`, `condition`).
   - If `GROQ_API_KEY` is unset, times out, returns HTTP errors, or produces invalid JSON, the service seamlessly falls back to the deterministic keyword/price/category parser (`_fallback_extract_filters`) and sets `fallback_used = True` with an explanatory `fallback_reason`.
   - When no product matches the requested keywords, PeerMart returns an empty list (`items: []`, `total: 0`) so the frontend displays a clear **"No Matching Products Found"** empty state rather than unrelated products.

4. **Rate Limiting & Caching:**
   - Sliding-window per-client rate limiting (`AI_SEARCH_RATE_LIMIT_PER_MIN`, default `10` requests/minute) returns `HTTP 429` when exceeded.
   - Normalized query caching (`TTLCache`, 120-second TTL) reduces redundant LLM calls.

## 2. Predefined 50-Query Evaluation Dataset

The evaluation dataset (`backend/dataset/ai_search_eval_queries.json`) and automated test suite (`backend/tests/test_ai_search_eval.py`) verify:
- **20 Genuine Student Search Queries (`G01`–`G20`):** Tested for HTTP 200 status ; a separate category/filter extraction assertion exists but its ground-truth coverage must be checked.
- **15 Prompt-Injection Queries (`I01`–`I15`):** Designed to test rejection (`HTTP 400`) without leaking secrets or executing raw SQL.
- **15 Invalid / Malformed Queries (`V01`–`V15`):** Designed to test validation rejection (`HTTP 400` / `HTTP 422`) on empty strings, whitespace-only inputs, >300-word payloads, control bytes, and missing JSON fields.

## 3. Responsible AI Usage During Development

AI coding assistance was used during CS602C development to:
- Draft SQLAlchemy models, Alembic migration scripts, and Pydantic v2 response schemas enforcing seller email privacy.
- Implement state machine guards for offer/listing transitions (`backend/app/services/state_machine.py`) and atomic payment locking (`with_for_update()`).
- Build React TypeScript UI components for the Admin Dashboard, Registration Approval, Deactivation Request workflow, and Demo Payment Gateway.
- Author Pytest integration tests and Playwright multi-user E2E tests.

All generated code was reviewed, verified against the 26 project requirements, and validated with automated test suites.


## 4. MS-6 Evaluation Evidence and Interpretation

| Evaluation group | Number of cases | Expected API behavior |
|---|---:|---|
| Genuine product queries | 20 | HTTP 200 and a structured response |
| Prompt-injection attempts | 15 | HTTP 400 rejection |
| Invalid/malformed requests | 15 | HTTP 400 or HTTP 422 validation response |
| **Total** | **50** | Defined test expectations |

The evaluation dataset is at `backend/dataset/ai_search_eval_queries.json`, and the test suite is at `backend/tests/test_ai_search_eval.py`. The automated suite clears `GROQ_API_KEY` to exercise deterministic fallback and API safeguards. It should **not** be cited as a measurement of live Groq model accuracy. In particular, genuine-query category accuracy is not independently established when test cases omit `expected_category`. Any previously documented 100% figures are repository-reported claims, not newly reproduced results.

The committed `docs/coverage.xml` records **88.48% backend line coverage (384/434 lines)**; coverage is a software testing metric, not an AI model accuracy metric.

## 5. Final Deployment Configuration and Limitations

- The Docker Compose file sets the default Groq model to `openai/gpt-oss-20b`, configurable with `GROQ_MODEL`. This supersedes older `llama-3.3-70b-versatile` and Gemini references.
- The Groq key is read only by the backend. Never commit `.env` files or actual API keys.
- The deterministic fallback is used when the Groq key is absent or a model request fails; this improves availability but may not match a language model's semantic interpretation.
- Pattern-based prompt-injection checks and validated filters reduce risk but are not a formal security guarantee.
- The 50-query benchmark is limited in size and does not establish live-model precision, recall or relevance ranking.

## 6. MS-6 Documentation and Responsible Use

The final report and presentation are stored in the team's `MS6_Final_Deliverables` Google Drive folder. The main repository [README.md](README.md) links to the Figma prototype, ER diagram, OpenAPI contract, coverage report and relevant pull requests. AI-assisted coding contributions remain subject to human review, automated testing and project demonstration; do not treat generated output as verified solely because an AI tool produced it.
