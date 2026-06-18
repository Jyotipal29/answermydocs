from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_google_token,
    verify_password,
)
from app.config import get_settings
from app.db.client import get_pg_connection, get_supabase_client
from app.limits import limiter
from app.models import (
    GoogleAuthRequest,
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserPlan,
    UserResponse,
    UsageResponse,
)

settings = get_settings()
router = APIRouter()


# ---------------------------------------------------------------------------
# Signup / Login / Google OAuth
# ---------------------------------------------------------------------------


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest):
    client = get_supabase_client()

    existing = await client.table("users").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    result = await client.table("users").insert(
        {
            "email": body.email,
            "name": body.name,
            "password_hash": hash_password(body.password),
            "plan": "free",
        }
    ).execute()

    user = result.data[0]
    return TokenResponse(access_token=create_access_token(user["id"], plan=user["plan"]))


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, body: LoginRequest):
    client = get_supabase_client()

    result = await client.table("users").select("*").eq("email", body.email).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    user = result.data[0]
    password_hash = user.get("password_hash")
    if not password_hash or not verify_password(body.password, password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return TokenResponse(access_token=create_access_token(user["id"], plan=user["plan"]))


@router.post("/google", response_model=TokenResponse)
@limiter.limit("5/minute")
async def google_auth(request: Request, body: GoogleAuthRequest):
    claims = await verify_google_token(body.id_token)
    email = claims.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token missing email claim")

    name = claims.get("name", "")
    client = get_supabase_client()

    existing = await client.table("users").select("*").eq("email", email).execute()
    if existing.data:
        user = existing.data[0]
    else:
        result = await client.table("users").insert(
            {"email": email, "name": name, "plan": "free"}
        ).execute()
        user = result.data[0]

    return TokenResponse(access_token=create_access_token(user["id"], plan=user["plan"]))


@router.post("/logout")
async def logout():
    # JWT is stateless — the client discards the token
    return {"detail": "Logged out"}


# ---------------------------------------------------------------------------
# Current user
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    return current_user


@router.get("/me/usage", response_model=UsageResponse)
async def get_my_usage(current_user: UserResponse = Depends(get_current_user)):
    client = get_supabase_client()

    # Document count + total storage
    doc_result = (
        await client.table("documents")
        .select("file_size_bytes", count="exact")
        .eq("user_id", str(current_user.id))
        .neq("status", "failed")
        .execute()
    )
    doc_count = doc_result.count or 0
    total_bytes = sum(d["file_size_bytes"] for d in (doc_result.data or []))

    # Message count this calendar month
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    async with get_pg_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT COUNT(*) FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.user_id = %s
                  AND m.role = 'user'
                  AND m.created_at >= %s
                """,
                (str(current_user.id), month_start),
            )
            row = await cur.fetchone()
            msg_count: int = row[0] if row else 0

    is_free = current_user.plan == UserPlan.free
    return UsageResponse(
        messages_this_month=msg_count,
        messages_limit=settings.max_messages_free_monthly if is_free else -1,
        documents_count=doc_count,
        documents_limit=settings.max_docs_free if is_free else -1,
        storage_bytes=total_bytes,
        storage_limit_bytes=(
            settings.max_storage_bytes_free if is_free else settings.max_storage_bytes_pro
        ),
    )
