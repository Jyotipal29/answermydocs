# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AnswerMyDocs is a PDF chat SaaS. Users upload PDFs, ask questions in plain English, and receive source-cited answers. The stack is a FastAPI backend with a LangGraph RAG pipeline + Supabase, paired with a Next.js 16 / React 19 frontend.

---

## Commands

### Backend (`/backend`)

```bash
# Start dev server
uv run uvicorn app.main:app --reload

# Run all tests
uv run pytest

# Run a single test file
uv run pytest tests/test_api.py

# Run a single test
uv run pytest tests/test_api.py::test_function_name -v
```

### Frontend (`/frontend`)

> **CRITICAL — Next.js 16 breaking changes:** This is NOT the Next.js you know. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.

```bash
# Start dev server
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

---

## Environment Variables

### Backend (`backend/.env`)

Required: `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DATABASE_URL`, `JWT_SECRET_KEY`

Optional: `LANGCHAIN_API_KEY` (LangSmith tracing), `GOOGLE_CLIENT_ID` (Google OAuth), `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRO_PRICE_ID` (billing)

### Frontend (`frontend/.env.local`)

`NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`), `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

---

## Architecture

### Backend (`backend/app/`)

**Singleton initialization pattern** — `main.py` lifespan initializes three module-level singletons that routers access via `request.app.state` or module-level getters:
- `ResponseCache` — in-memory cache keyed by `(user_id, doc_ids, query)`, TTL varies by plan
- `MetricsCollector` — lightweight request/error/latency counters
- `PDFIndexer` (`rag/indexer.py`) and `HybridRetriever`/LangGraph graph (`rag/agent.py`) — initialized once with shared `OpenAIEmbeddings`

**Database layer** — two clients coexist:
- `supabase.AsyncClient` (via `app.db.client`) — used for all application data (users, documents, workspaces, conversations, messages) and Supabase Storage for raw PDFs
- Raw `psycopg3` async connection (`get_pg_connection()`) — used by the BM25 corpus builder to query `langchain_pg_embedding` directly (the LangChain PGVector table)

**RAG pipeline** (`rag/`) — a LangGraph `StateGraph` with `RAGState`:
1. `retrieve` — `HybridRetriever` fuses PGVector cosine similarity + Okapi BM25 via Reciprocal Rank Fusion (RRF). BM25 corpus is cached by `(user_id, frozenset(doc_ids))`; call `invalidate_bm25_cache(doc_id)` on document deletion.
2. `rerank` — parallel `gpt-4o-mini` calls score each chunk for usefulness (not just direct-answer relevance); top `rerank_top_k` (default 8) kept, `max_score` becomes `relevance_score`
3. Router — if `relevance_score >= 0.3` and docs exist: generate; else if retries remain: rewrite query and loop; else: fallback message
4. `rewrite` — query reformulation using the LLM
5. `generate` / `fallback` — answer generation with inline citations `[filename, p.N]`

Max retries: 2 (configurable via `settings.max_retries`).

**Chat endpoint** (`routers/chat.py`) — streams via SSE (`StreamingResponse`, `text/event-stream`). The graph's `astream_events(version="v2")` emits `on_chat_model_stream` events for tokens. SSE message types: `conversation_id`, `token`, `sources`, `error`, `[DONE]`.

**Security pipeline** (`security.py`) — runs on every chat message: prompt injection detection → delimiter cleaning → PII masking on input; PII masking + harmful-content blocking on LLM output.

**Rate limiting** — SlowAPI with per-plan limits extracted from the JWT in HTTP middleware (`set_user_plan_middleware`), so `get_rate_limit()` doesn't need a DB round-trip. Plans: `free` (20/min), `pro` (100/min).

**PDF indexing** (`rag/indexer.py`) — runs as a FastAPI `BackgroundTask`. Progress events are pushed to per-`doc_id` `asyncio.Queue`s; `routers/documents.py` SSE endpoint reads from them. Uses `SemanticChunker` (LangChain Experimental) with `RecursiveCharacterTextSplitter` as fallback.

**Plans / billing** — `free`, `pro`, `enterprise` (`UserPlan` enum). Limits enforced via `app/limits.py`. Stripe webhook handler in `routers/billing.py`.

**Settings** — `app/config.py` using `pydantic-settings`, loaded once via `@lru_cache`. All tunable values live here. Two-stage retrieval sizes: `retrieval_k=20` (candidates into `rerank`), `rerank_top_k=8` (docs passed to the LLM).

### Frontend (`frontend/`)

**Routing** — Next.js App Router. Pages: `/` (landing), `/(auth)/login`, `/(auth)/signup`, `/dashboard`, `/upload`, `/chat/[id]`, `/settings`.

**State management** — Zustand (`store/useAuthStore.ts`) for auth state (user + JWT token via `js-cookie`). React Query (`@tanstack/react-query`) for server state.

**API layer** (`lib/api.ts`) — Axios instance with JWT interceptor for standard REST calls. Chat and document-status SSE use native `fetch` + `ReadableStream` (not `EventSource`) because `EventSource` cannot send `Authorization` headers.

**UI** — Tailwind CSS v4 + shadcn/ui (Radix UI primitives). Components split into `components/ui/` (shadcn primitives) and `components/chat/`, `components/landing/`.

**Chat SSE protocol** — `sendChatMessage()` in `lib/api.ts` handles the full SSE stream, emitting callbacks: `onConversationId`, `onToken`, `onSources`, `onDone`, `onError`.

### Database Schema (`backend/app/db/migrations/`)

Tables (sequential migrations 001–006): `users`, `documents`, `workspaces` + `workspace_documents`, `conversations`, `messages`, plus `langchain_pg_embedding` (managed by LangChain PGVector) with HNSW index for fast vector search.

---

## Tests

Backend tests (`backend/tests/`) mock all external services — Supabase, OpenAI, Stripe — so the suite runs offline. The `app_client` fixture patches `init_supabase`, `init_indexer`, and `init_agent` to skip lifespan side-effects. Use `mock_supabase` to control DB responses per-test and `mock_rag` to skip the RAG graph in chat tests.

---

## Key Invariants

- **All PGVector operations are sync** — `PGVector.similarity_search()` and `vectorstore.add_documents()` are synchronous LangChain calls; wrap them in `asyncio.to_thread()` to avoid blocking the event loop.
- **Document isolation** — vector and BM25 searches always filter by `user_id` AND `doc_ids`; users only see their own chunks.
- **Connection string normalization** — `supabase_database_url` must be converted from `postgres://` → `postgresql+psycopg://` for LangChain's psycopg3 driver. Use `_normalise_conn_str()` from `rag/indexer.py`.
- **Swagger UI disabled in production** — `docs_url` is `None` when `settings.is_production`.
