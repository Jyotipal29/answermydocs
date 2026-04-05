from fastapi import APIRouter, HTTPException, Request

from app.models.schemas import SessionResponse, MessageResponse
from app.services.session_manager import (
    create_session,
    list_sessions,
    get_session,
    delete_session,
    collection_name_for,
)
from app.services.message_store import get_messages
from app.rag.vectorstore import delete_collection

router = APIRouter()


@router.post("/sessions", response_model=SessionResponse)
async def create(request: Request):
    user_id = request.state.user_id
    session = await create_session(user_id)
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def list_all(request: Request):
    user_id = request.state.user_id
    return await list_sessions(user_id)


@router.delete("/sessions/{session_id}")
async def delete(session_id: str, request: Request):
    user_id = request.state.user_id
    session = await get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    delete_collection(collection_name_for(session_id))
    await delete_session(session_id, user_id)

    return {"message": "Session deleted."}


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_session_messages(session_id: str, request: Request):
    user_id = request.state.user_id
    session = await get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return await get_messages(session_id)
