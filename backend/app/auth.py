from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.models import UserPlan, UserResponse

settings = get_settings()

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT
# ---------------------------------------------------------------------------


def create_access_token(user_id: str, plan: str = "free") -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": expire, "plan": plan},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def _decode_token(token: str) -> str:
    """Decode JWT and return user_id. Raises HTTP 401 on any failure."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exc
        return user_id
    except JWTError:
        raise credentials_exc


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


async def verify_google_token(id_token_str: str) -> dict:
    """
    Verify a Google ID token issued by @react-oauth/google on the frontend.
    Returns the decoded token claims (sub, email, name, picture).
    """
    import asyncio

    def _verify() -> dict:
        request = google_requests.Request()
        return google_id_token.verify_oauth2_token(
            id_token_str,
            request,
            settings.google_client_id,
        )

    try:
        return await asyncio.to_thread(_verify)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def _fetch_user(user_id: str) -> UserResponse:
    # Deferred import — db.client is initialized during FastAPI lifespan (main.py).
    from app.db.client import get_supabase_client

    client = get_supabase_client()
    result = await client.table("users").select("*").eq("id", user_id).single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    row = result.data
    return UserResponse(
        id=row["id"],
        email=row["email"],
        name=row.get("name") or "",
        plan=UserPlan(row["plan"]),
        created_at=row["created_at"],
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    user_id = _decode_token(token)
    return await _fetch_user(user_id)


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme_optional),
) -> Optional[UserResponse]:
    """Dependency for endpoints accessible both with and without auth."""
    if token is None:
        return None
    try:
        user_id = _decode_token(token)
        return await _fetch_user(user_id)
    except HTTPException:
        return None
