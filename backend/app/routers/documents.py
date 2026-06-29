import asyncio
import json
import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from storage3.exceptions import StorageApiError

from app.auth import get_current_user
from app.config import get_settings
from app.db.client import get_pg_connection, get_supabase_client
from app.limits import check_pdf_size, enforce_doc_limit, get_rate_limit, limiter
from app.models import DocumentResponse, DocumentStatus, DocumentStatusResponse, UserResponse
from app.rag.indexer import cleanup_progress_queue, get_indexer, get_progress_queue

settings = get_settings()
router = APIRouter()


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(get_rate_limit)
async def upload_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    _doc_limit: None = Depends(enforce_doc_limit),
):
    content = await file.read()

    # Validate before touching storage
    if content[:5] != b"%PDF-":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a PDF"
        )
    check_pdf_size(len(content), current_user.plan)

    client = get_supabase_client()
    doc_id = str(uuid.uuid4())
    filename = file.filename or "upload.pdf"
    storage_path = f"{current_user.id}/{doc_id}/{filename}"

    # Create document record with status=uploading
    result = await client.table("documents").insert(
        {
            "id": doc_id,
            "user_id": str(current_user.id),
            "filename": filename,
            "file_size_bytes": len(content),
            "status": DocumentStatus.uploading.value,
        }
    ).execute()

    doc = result.data[0]

    # Kick off indexing as a background task
    indexer = get_indexer()
    background_tasks.add_task(
        indexer.index,
        content=content,
        filename=filename,
        doc_id=doc_id,
        user_id=str(current_user.id),
        storage_path=storage_path,
    )

    return DocumentResponse(
        id=doc["id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        page_count=doc.get("page_count"),
        chunk_count=doc.get("chunk_count"),
        file_size_bytes=doc["file_size_bytes"],
        status=DocumentStatus(doc["status"]),
        created_at=doc["created_at"],
    )


# ---------------------------------------------------------------------------
# List / Get
# ---------------------------------------------------------------------------


@router.get("", response_model=list[DocumentResponse])
async def list_documents(current_user: UserResponse = Depends(get_current_user)):
    client = get_supabase_client()
    result = (
        await client.table("documents")
        .select("*")
        .eq("user_id", str(current_user.id))
        .order("created_at", desc=True)
        .execute()
    )
    return [
        DocumentResponse(
            id=d["id"],
            user_id=d["user_id"],
            filename=d["filename"],
            page_count=d.get("page_count"),
            chunk_count=d.get("chunk_count"),
            file_size_bytes=d["file_size_bytes"],
            status=DocumentStatus(d["status"]),
            created_at=d["created_at"],
        )
        for d in (result.data or [])
    ]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, current_user: UserResponse = Depends(get_current_user)):
    client = get_supabase_client()
    result = await client.table("documents").select("*").eq("id", doc_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc = result.data[0]
    if doc["user_id"] != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return DocumentResponse(
        id=doc["id"],
        user_id=doc["user_id"],
        filename=doc["filename"],
        page_count=doc.get("page_count"),
        chunk_count=doc.get("chunk_count"),
        file_size_bytes=doc["file_size_bytes"],
        status=DocumentStatus(doc["status"]),
        created_at=doc["created_at"],
    )


# ---------------------------------------------------------------------------
# File download (signed URL redirect)
# ---------------------------------------------------------------------------


@router.get("/{doc_id}/file")
async def get_document_file(
    doc_id: str, current_user: UserResponse = Depends(get_current_user)
):
    client = get_supabase_client()
    result = await client.table("documents").select("user_id, storage_path, status").eq("id", doc_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc = result.data[0]
    if doc["user_id"] != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not doc.get("storage_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not yet stored")

    # Supabase Storage can return 500 on cold starts (free-tier sleep).
    # Retry once after a brief wait before surfacing the error to the client.
    for attempt in range(2):
        try:
            signed = await client.storage.from_("documents").create_signed_url(
                doc["storage_path"], expires_in=300
            )
            break
        except StorageApiError:
            if attempt == 0:
                await asyncio.sleep(1)
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="File storage is temporarily unavailable. Please try again in a moment.",
                )

    url = signed.get("signedURL") or signed.get("signedUrl")
    if not url:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not generate file URL")

    return RedirectResponse(url=url, status_code=302)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    request: Request,
    current_user: UserResponse = Depends(get_current_user),
):
    client = get_supabase_client()
    result = await client.table("documents").select("*").eq("id", doc_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc = result.data[0]
    if doc["user_id"] != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Delete vectors from PGVector
    async with get_pg_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                DELETE FROM langchain_pg_embedding
                WHERE cmetadata->>'doc_id' = %s
                  AND cmetadata->>'user_id' = %s
                """,
                (doc_id, str(current_user.id)),
            )

    # Delete raw file from Supabase Storage
    if doc.get("storage_path"):
        await client.storage.from_("documents").remove([doc["storage_path"]])

    # Delete document record (cascades to workspace_documents)
    await client.table("documents").delete().eq("id", doc_id).execute()

    # Evict stale cache and BM25 corpus entries
    from app.rag.agent import _retriever

    request.app.state.cache.invalidate_by_doc(doc_id)
    if _retriever:
        _retriever.invalidate_bm25_cache(doc_id)


# ---------------------------------------------------------------------------
# SSE indexing progress
# ---------------------------------------------------------------------------


@router.get("/{doc_id}/status")
async def document_status_stream(
    doc_id: str, current_user: UserResponse = Depends(get_current_user)
):
    client = get_supabase_client()
    result = await client.table("documents").select("status").eq("id", doc_id).execute()

    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    doc = result.data[0]

    async def event_generator():
        current_status = doc["status"]

        # Emit current DB status immediately so late-connecting clients get context
        yield f"data: {json.dumps({'status': current_status, 'message': current_status.capitalize()})}\n\n"

        # If indexing is already complete, close immediately
        if current_status in ("ready", "failed"):
            return

        queue = get_progress_queue(doc_id)
        try:
            while True:
                event = await queue.get()
                if event is None:  # sentinel — indexer finished
                    break
                yield f"data: {json.dumps(event)}\n\n"
                if event.get("status") in ("ready", "failed"):
                    break
        finally:
            cleanup_progress_queue(doc_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
