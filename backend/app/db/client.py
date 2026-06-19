from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

import psycopg
from supabase import AsyncClient, acreate_client

from app.config import get_settings

settings = get_settings()

_supabase: Optional[AsyncClient] = None


async def init_supabase() -> None:
    global _supabase
    _supabase = await acreate_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )


async def close_supabase() -> None:
    global _supabase
    _supabase = None


def get_supabase_client() -> AsyncClient:
    if _supabase is None:
        raise RuntimeError("Supabase client not initialised — call init_supabase() first")
    return _supabase


@asynccontextmanager
async def get_pg_connection() -> AsyncGenerator[psycopg.AsyncConnection, None]:
    """
    Async context manager for raw psycopg3 connections.
    Used by the BM25 corpus builder and any query that needs SQL
    not expressible through the Supabase client.
    """
    conn = await psycopg.AsyncConnection.connect(
        settings.supabase_database_url,
        autocommit=True,
    )
    try:
        yield conn
    finally:
        await conn.close()
