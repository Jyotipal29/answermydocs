from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest
from app.rag.vectorstore import retrieve
from app.rag.llm import stream_response
from app.services.session_manager import get_session, collection_name_for
from app.services.message_store import save_message

router = APIRouter()


@router.post("/chat")
async def chat(request: Request, chat_request: ChatRequest):
    user_id = request.state.user_id
    session = await get_session(chat_request.session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    await save_message(chat_request.session_id, user_id, "user", chat_request.question)

    collection = collection_name_for(chat_request.session_id)
    context_docs = retrieve(collection, chat_request.question)

    async def stream_and_save() -> AsyncIterator[str]:
        accumulated = ""
        async for chunk in stream_response(
            chat_request.question, context_docs, chat_request.chat_history
        ):
            accumulated += chunk
            yield chunk
        await save_message(chat_request.session_id, user_id, "assistant", accumulated)

    return StreamingResponse(
        stream_and_save(),
        media_type="text/plain",
    )
