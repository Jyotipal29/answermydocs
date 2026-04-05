from datetime import datetime, timezone

from app.db import get_database


async def save_message(session_id: str, user_id: str, role: str, content: str):
    db = get_database()
    await db.messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def get_messages(session_id: str) -> list[dict]:
    db = get_database()
    cursor = db.messages.find(
        {"session_id": session_id},
        {"_id": 0, "role": 1, "content": 1, "created_at": 1},
    ).sort("created_at", 1)
    return [doc async for doc in cursor]
