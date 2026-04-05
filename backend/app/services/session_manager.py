import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.db import get_database


def collection_name_for(session_id: str) -> str:
    return f"session_{session_id}"


async def create_session() -> dict:
    db = get_database()
    session_id = uuid.uuid4().hex[:12]
    session = {
        "_id": session_id,
        "user_id": None,
        "name": "",
        "filename": "",
        "pdfs": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.insert_one(session)
    return _to_response(session)


async def get_session(session_id: str) -> dict | None:
    db = get_database()
    doc = await db.sessions.find_one({"_id": session_id})
    if doc:
        return _to_response(doc)
    return None


async def get_session_raw(session_id: str) -> dict | None:
    db = get_database()
    return await db.sessions.find_one({"_id": session_id})


async def list_sessions() -> list[dict]:
    db = get_database()
    cursor = db.sessions.find().sort("created_at", -1)
    sessions = []
    async for doc in cursor:
        sessions.append(_to_response(doc))
    return sessions


async def set_primary_pdf(session_id: str, filename: str):
    db = get_database()
    await db.sessions.update_one(
        {"_id": session_id},
        {
            "$set": {
                "name": Path(filename).stem,
                "filename": filename,
            },
            "$push": {"pdfs": filename},
        },
    )


async def add_supporting_pdf(session_id: str, filename: str):
    db = get_database()
    await db.sessions.update_one(
        {"_id": session_id},
        {"$push": {"pdfs": filename}},
    )


async def delete_session(session_id: str) -> bool:
    db = get_database()
    result = await db.sessions.delete_one({"_id": session_id})
    # Also delete all messages for this session
    await db.messages.delete_many({"session_id": session_id})
    return result.deleted_count > 0


def _to_response(doc: dict) -> dict:
    pdfs = doc.get("pdfs", [])
    primary = doc.get("filename", "")
    supporting = [p for p in pdfs if p != primary] if primary else []
    return {
        "id": doc["_id"],
        "name": doc.get("name", ""),
        "created_at": doc.get("created_at", ""),
        "primary_pdf": primary,
        "supporting_pdfs": supporting,
    }
