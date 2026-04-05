from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.services.vectorstore import retrieve
from app.services.llm import stream_response
from app.services.session_manager import get_session, collection_name_for
from app.services.message_store import save_message

router = APIRouter()


@router.post("/chat")
async def chat(request: ChatRequest):
    session = await get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    # Save user message to MongoDB
    await save_message(request.session_id, "user", request.question)

    collection = collection_name_for(request.session_id)
    context_docs = retrieve(collection, request.question)

    async def stream_and_save() -> AsyncIterator[str]:
        accumulated = ""
        async for chunk in stream_response(
            request.question, context_docs, request.chat_history
        ):
            accumulated += chunk
            yield chunk
        # Save full assistant response after stream completes
        await save_message(request.session_id, "assistant", accumulated)

    return StreamingResponse(
        stream_and_save(),
        media_type="text/plain",
    )
