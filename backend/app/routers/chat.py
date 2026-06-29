import json
import time
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.auth import get_current_user
from app.cache import ResponseCache
from app.config import get_settings
from app.db.client import get_supabase_client
from app.limits import enforce_message_limit, get_rate_limit, limiter
from app.models import ChatRequest, MessageRole, UserPlan, UserResponse
from app.rag.agent import RAGState, get_rag_graph
from app.security import SecurityPipeline

settings = get_settings()
router = APIRouter()
_security = SecurityPipeline()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _resolve_doc_ids(body: ChatRequest, user_id: str) -> list[str]:
    """
    Union of explicit document_ids and documents from workspace_id.
    Only includes documents with status=ready that belong to user_id.
    """
    doc_ids: set[str] = {str(d) for d in body.document_ids}

    if body.workspace_id:
        client = get_supabase_client()
        wd = (
            await client.table("workspace_documents")
            .select("document_id")
            .eq("workspace_id", str(body.workspace_id))
            .execute()
        )
        ws_ids = [r["document_id"] for r in (wd.data or [])]
        if ws_ids:
            docs = (
                await client.table("documents")
                .select("id, user_id")
                .in_("id", ws_ids)
                .eq("status", "ready")
                .execute()
            )
            for d in (docs.data or []):
                if d["user_id"] == user_id:
                    doc_ids.add(d["id"])

    return list(doc_ids)


async def _resolve_conversation(body: ChatRequest, user_id: str, message: str) -> str:
    """Return an existing conversation ID (after ownership check) or create a new one."""
    client = get_supabase_client()

    if body.conversation_id:
        result = (
            await client.table("conversations")
            .select("user_id")
            .eq("id", str(body.conversation_id))
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found"
            )
        if result.data[0]["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Access denied"
            )
        return str(body.conversation_id)

    title = message[:60].strip() + ("…" if len(message) > 60 else "")
    result = await client.table("conversations").insert(
        {
            "user_id": user_id,
            "title": title,
            "workspace_id": str(body.workspace_id) if body.workspace_id else None,
            "document_id": str(body.document_ids[0]) if len(body.document_ids) == 1 else None,
        }
    ).execute()
    return result.data[0]["id"]


# ---------------------------------------------------------------------------
# Core streaming generator
# ---------------------------------------------------------------------------


async def _stream_from_graph(
    sanitized_message: str,
    user_id: str,
    doc_ids: list[str],
    conversation_id: str,
    cache: ResponseCache,
    ttl: int,
    metrics,
) -> AsyncGenerator[str, None]:
    graph = get_rag_graph()
    initial_state: RAGState = {
        "query": sanitized_message,
        "rewritten_query": "",
        "documents": [],
        "generation": "",
        "sources": [],
        "relevance_score": 0.0,
        "retry_count": 0,
        "max_retries": settings.max_retries,
        "user_id": user_id,
        "doc_ids": doc_ids,
    }

    token_buffer: list[str] = []
    final_sources: list[dict] = []
    final_generation: str = ""
    retrieval_attempts = 1
    is_fallback = False
    t_start = time.time()
    error_occurred = False

    try:
        async for event in graph.astream_events(initial_state, version="v2"):
            kind = event["event"]
            node = event.get("metadata", {}).get("langgraph_node", "")

            if kind == "on_chat_model_stream" and node == "generate":
                token = getattr(event["data"]["chunk"], "content", "") or ""
                if token:
                    token_buffer.append(token)
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            elif kind == "on_chain_end" and event["name"] == "LangGraph":
                output = event["data"].get("output", {})
                final_sources = output.get("sources", [])
                final_generation = output.get("generation", "")
                retrieval_attempts = output.get("retry_count", 0) + 1
                is_fallback = not output.get("documents")

    except Exception:
        error_occurred = True
        yield f"data: {json.dumps({'type': 'error', 'content': 'An error occurred. Please try again.'})}\n\n"

    elapsed_ms = (time.time() - t_start) * 1000

    if error_occurred:
        yield "data: [DONE]\n\n"
        metrics.record_request(latency_ms=elapsed_ms, error=True)
        return

    # If the graph took the fallback path (no LLM, so no on_chat_model_stream events),
    # the generation text lives only in the final state output — stream it now.
    if not token_buffer and final_generation:
        yield f"data: {json.dumps({'type': 'token', 'content': final_generation})}\n\n"
        token_buffer.append(final_generation)

    # Output validation — runs before DB write so we never persist blocked content
    full_response = "".join(token_buffer)
    full_response, _ = _security.check_output(full_response)

    # Persist assistant message before [DONE] so data is durable when the client closes
    client = get_supabase_client()
    await client.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "role": MessageRole.assistant.value,
            "content": full_response,
            "sources": final_sources,
        }
    ).execute()

    await client.table("conversations").update(
        {"updated_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", conversation_id).execute()

    # Cache after [SOURCES] buffer is complete
    cache.set(user_id, doc_ids, sanitized_message, full_response, final_sources, ttl=ttl)

    metrics.record_request(
        latency_ms=elapsed_ms,
        cache_hit=False,
        retrieval_attempts=retrieval_attempts,
        fallback=is_fallback,
    )

    yield f"data: {json.dumps({'type': 'sources', 'sources': final_sources})}\n\n"
    yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------


@router.post("")
@limiter.limit(get_rate_limit)
async def chat(
    request: Request,
    body: ChatRequest,
    current_user: UserResponse = Depends(get_current_user),
    _msg_limit: None = Depends(enforce_message_limit),
):
    # 1. Security gate
    is_safe, sanitized_message, notes = _security.check_input(body.message)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=notes[0] if notes else "Message blocked by security filter",
        )

    # 2. Resolve document IDs
    doc_ids = await _resolve_doc_ids(body, str(current_user.id))
    if not doc_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No documents specified. Provide document_ids or a workspace_id.",
        )

    # 3. Resolve / create conversation
    conversation_id = await _resolve_conversation(
        body, str(current_user.id), sanitized_message
    )

    # 4. Persist user message
    client = get_supabase_client()
    await client.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "role": MessageRole.user.value,
            "content": body.message,
            "sources": [],
        }
    ).execute()

    # 5. Cache lookup
    cache: ResponseCache = request.app.state.cache
    ttl = (
        settings.cache_ttl_pro_seconds
        if current_user.plan in (UserPlan.pro, UserPlan.enterprise)
        else settings.cache_ttl_seconds
    )
    cached = cache.get(str(current_user.id), doc_ids, sanitized_message)

    if cached is not None:
        cached_response, cached_sources = cached

        async def _cached_gen():
            yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"
            yield f"data: {json.dumps({'type': 'token', 'content': cached_response})}\n\n"
            # Persist assistant message (same as live path) so conversation history
            # is complete when the frontend re-fetches the conversation from DB.
            await client.table("messages").insert(
                {
                    "conversation_id": conversation_id,
                    "role": MessageRole.assistant.value,
                    "content": cached_response,
                    "sources": cached_sources,
                }
            ).execute()
            await client.table("conversations").update(
                {"updated_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", conversation_id).execute()
            yield f"data: {json.dumps({'type': 'sources', 'sources': cached_sources})}\n\n"
            yield "data: [DONE]\n\n"
            request.app.state.metrics.record_request(latency_ms=0, cache_hit=True)

        return StreamingResponse(
            _cached_gen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # 6. Live stream from LangGraph
    async def _live_gen():
        yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"
        async for chunk in _stream_from_graph(
            sanitized_message=sanitized_message,
            user_id=str(current_user.id),
            doc_ids=doc_ids,
            conversation_id=conversation_id,
            cache=cache,
            ttl=ttl,
            metrics=request.app.state.metrics,
        ):
            yield chunk

    return StreamingResponse(
        _live_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
