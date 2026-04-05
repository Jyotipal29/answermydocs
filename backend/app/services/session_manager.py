import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import SESSIONS_FILE

_sessions: dict[str, dict] = {}


def _load():
    global _sessions
    path = Path(SESSIONS_FILE)
    if path.exists():
        _sessions = json.loads(path.read_text())


def _save():
    path = Path(SESSIONS_FILE)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(_sessions, indent=2))


# Load on import
_load()


def create_session() -> dict:
    session_id = uuid.uuid4().hex[:12]
    session = {
        "id": session_id,
        "name": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "primary_pdf": "",
        "supporting_pdfs": [],
    }
    _sessions[session_id] = session
    _save()
    return session


def get_session(session_id: str) -> dict | None:
    return _sessions.get(session_id)


def list_sessions() -> list[dict]:
    return sorted(_sessions.values(), key=lambda s: s["created_at"], reverse=True)


def set_primary_pdf(session_id: str, filename: str):
    session = _sessions.get(session_id)
    if session:
        session["primary_pdf"] = filename
        session["name"] = Path(filename).stem
        _save()


def add_supporting_pdf(session_id: str, filename: str):
    session = _sessions.get(session_id)
    if session:
        session["supporting_pdfs"].append(filename)
        _save()


def delete_session(session_id: str) -> bool:
    if session_id in _sessions:
        del _sessions[session_id]
        _save()
        return True
    return False


def collection_name_for(session_id: str) -> str:
    return f"session_{session_id}"
