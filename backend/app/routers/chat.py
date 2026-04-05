from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.services.vectorstore import retrieve
from app.services.llm import stream_response
from app.services.session_manager import get_session, collection_name_for

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    session = get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    collection = collection_name_for(request.session_id)
    context_docs = retrieve(collection, request.question)

    return StreamingResponse(
        stream_response(request.question, context_docs, request.chat_history),
        media_type="text/plain",
    )
