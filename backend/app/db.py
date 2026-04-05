import certifi
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import MONGODB_URI, MONGODB_DB

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect():
    global _client, _db
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(MONGODB_URI, tlsCAFile=certifi.where())
    _db = _client[MONGODB_DB]
    try:
        await _client.admin.command("ping")
        logger.info("MongoDB connected successfully (db: %s)", MONGODB_DB)
    except Exception as e:
        logger.error("MongoDB connection failed: %s", e)
        raise


async def close():
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None


def get_database() -> AsyncIOMotorDatabase:
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect() first.")
    return _db
