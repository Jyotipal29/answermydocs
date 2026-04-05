from fastapi import APIRouter, HTTPException

from app.models.schemas import SessionResponse
from app.services.session_manager import (
    create_session,
    list_sessions,
    get_session,
    delete_session,
    collection_name_for,
)
from app.services.vectorstore import delete_collection

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse)
async def create():
    session = create_session()
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def list_all():
    return list_sessions()


@router.delete("/sessions/{session_id}")
async def delete(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    delete_collection(collection_name_for(session_id))
    delete_session(session_id)

    return {"message": "Session deleted."}
