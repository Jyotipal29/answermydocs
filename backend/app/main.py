from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth import get_current_user
from app.cache import ResponseCache
from app.config import get_settings
from app.db import close_supabase, init_supabase
from app.limits import limiter
from app.models import UserPlan, UserResponse
from app.monitoring import MetricsCollector, get_logger
from app.rag.agent import init_agent

settings = get_settings()
logger = get_logger()

# Module-level singletons — attached to app.state in lifespan so routers
# can reach them via request.app.state.cache / .metrics
cache = ResponseCache()
metrics = MetricsCollector()


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    from langchain_openai import OpenAIEmbeddings

    from app.rag.indexer import init_indexer

    await init_supabase()
    embeddings = OpenAIEmbeddings(model=settings.embedding_model)
    init_agent(embeddings)
    init_indexer(embeddings)

    app.state.cache = cache
    app.state.metrics = metrics

    logger.info("AnswerMyDocs API started", extra={"extra_data": {"env": settings.app_env}})
    yield

    await close_supabase()
    logger.info("AnswerMyDocs API stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="AnswerMyDocs API",
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------------------------
# Middleware: set request.state.user_plan from JWT so get_rate_limit()
# can return the right SlowAPI string without a DB round-trip.
# ---------------------------------------------------------------------------


@app.middleware("http")
async def set_user_plan_middleware(request: Request, call_next):
    plan = "free"
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            payload = jwt.decode(
                auth_header[7:],
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            plan = payload.get("plan", "free")
        except JWTError:
            pass
    request.state.user_plan = plan
    return await call_next(request)


# ---------------------------------------------------------------------------
# Routers — all declared unconditionally
# ---------------------------------------------------------------------------

from app.routers import auth as auth_router  # noqa: E402
from app.routers import billing as billing_router  # noqa: E402
from app.routers import chat as chat_router  # noqa: E402
from app.routers import conversations as conversations_router  # noqa: E402
from app.routers import documents as documents_router  # noqa: E402
from app.routers import workspaces as workspaces_router  # noqa: E402

app.include_router(auth_router.router,          prefix="/auth",          tags=["auth"])
app.include_router(documents_router.router,     prefix="/documents",     tags=["documents"])
app.include_router(workspaces_router.router,    prefix="/workspaces",    tags=["workspaces"])
app.include_router(chat_router.router,          prefix="/chat",          tags=["chat"])
app.include_router(conversations_router.router, prefix="/conversations",  tags=["conversations"])
app.include_router(billing_router.router,       prefix="/billing",       tags=["billing"])


# ---------------------------------------------------------------------------
# System endpoints
# ---------------------------------------------------------------------------


@app.get("/health", tags=["system"])
async def health_check():
    from app.db.client import get_supabase_client
    from app.rag.agent import get_rag_graph

    agent_ok = True
    db_ok = True

    try:
        get_rag_graph()
    except RuntimeError:
        agent_ok = False

    try:
        client = get_supabase_client()
        await client.table("users").select("id").limit(1).execute()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if agent_ok and db_ok else "degraded",
        "environment": settings.app_env,
        "version": "1.0.0",
        "checks": {
            "agent": agent_ok,
            "security": True,
            "cache": True,
            "database": db_ok,
        },
    }


@app.get("/metrics", tags=["system"])
async def get_metrics(current_user: UserResponse = Depends(get_current_user)):
    if current_user.plan != UserPlan.enterprise:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return metrics.summary


@app.get("/cache/stats", tags=["system"])
async def cache_stats():
    return cache.stats
