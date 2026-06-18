from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.config import get_settings
from app.models import UserPlan, UserResponse

settings = get_settings()

# Mount this on the FastAPI app in main.py:
#   app.state.limiter = limiter
#   app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
limiter = Limiter(key_func=get_remote_address)


def get_rate_limit(request: Request) -> str:
    """
    Dynamic SlowAPI limit string keyed on user plan.
    main.py middleware decodes the JWT and sets request.state.user_plan
    before this is called, so no DB round-trip is needed here.
    """
    plan = getattr(request.state, "user_plan", "free")
    if plan in ("pro", "enterprise"):
        return settings.rate_limit_pro
    return settings.rate_limit_free


# ---------------------------------------------------------------------------
# Document-count enforcement
# ---------------------------------------------------------------------------


async def enforce_doc_limit(
    current_user: UserResponse = Depends(get_current_user),
) -> None:
    """Dependency: raise 429 when a free user tries to exceed their document quota."""
    if current_user.plan != UserPlan.free:
        return

    from app.db.client import get_supabase_client

    client = get_supabase_client()
    result = (
        await client.table("documents")
        .select("id", count="exact")
        .eq("user_id", str(current_user.id))
        .neq("status", "failed")
        .execute()
    )
    if (result.count or 0) >= settings.max_docs_free:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Free tier limit: {settings.max_docs_free} documents maximum. "
                "Upgrade to Pro for unlimited documents."
            ),
        )


# ---------------------------------------------------------------------------
# Monthly message-count enforcement
# ---------------------------------------------------------------------------


async def enforce_message_limit(
    current_user: UserResponse = Depends(get_current_user),
) -> None:
    """Dependency: raise 429 when a free user has used all monthly messages."""
    if current_user.plan != UserPlan.free:
        return

    from app.db.client import get_pg_connection

    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    async with get_pg_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT COUNT(*)
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = %s
                  AND m.role = 'user'
                  AND m.created_at >= %s
                """,
                (str(current_user.id), month_start),
            )
            row = await cur.fetchone()
            count: int = row[0] if row else 0

    if count >= settings.max_messages_free_monthly:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Free tier limit: {settings.max_messages_free_monthly} messages per month. "
                "Upgrade to Pro for unlimited messages."
            ),
        )


# ---------------------------------------------------------------------------
# PDF size check (called in the upload handler, not a dependency)
# ---------------------------------------------------------------------------


def check_pdf_size(file_size_bytes: int, plan: UserPlan) -> None:
    """Raise HTTP 413 if the uploaded PDF exceeds the plan's size limit."""
    limit_bytes = (
        settings.max_pdf_bytes_pro
        if plan in (UserPlan.pro, UserPlan.enterprise)
        else settings.max_pdf_bytes_free
    )
    if file_size_bytes > limit_bytes:
        limit_mb = limit_bytes // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"PDF exceeds the {limit_mb} MB limit for your plan.",
        )
