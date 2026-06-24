import asyncio
import re
from typing import Optional

import fitz  # PyMuPDF
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings
from app.db.client import get_supabase_client

settings = get_settings()

# ---------------------------------------------------------------------------
# SSE progress bridge
# ---------------------------------------------------------------------------
# One asyncio.Queue per doc_id. The indexer pushes events; the SSE endpoint
# in routers/documents.py reads them. None is the sentinel that closes the stream.

_progress_queues: dict[str, asyncio.Queue] = {}


def get_progress_queue(doc_id: str) -> asyncio.Queue:
    if doc_id not in _progress_queues:
        _progress_queues[doc_id] = asyncio.Queue()
    return _progress_queues[doc_id]


def cleanup_progress_queue(doc_id: str) -> None:
    _progress_queues.pop(doc_id, None)


# ---------------------------------------------------------------------------
# Pure functions (run in thread pool via asyncio.to_thread)
# ---------------------------------------------------------------------------


def _sanitize_filename(filename: str) -> str:
    return re.sub(r"[^\w.\-]", "_", filename)[:200]


def _validate_pdf(content: bytes) -> None:
    if content[:5] != b"%PDF-":
        raise ValueError("Uploaded file is not a valid PDF")


def _extract_pages(content: bytes, filename: str) -> list[Document]:
    pdf = fitz.open(stream=content, filetype="pdf")
    pages = []
    for page_num in range(len(pdf)):
        text = pdf[page_num].get_text()
        if text.strip():
            pages.append(
                Document(
                    page_content=text,
                    metadata={"page_number": page_num + 1, "source": filename},
                )
            )
    pdf.close()
    return pages


def _clean_page_text(text: str) -> str:
    """Strip common PDF noise: standalone page numbers and short header/footer lines."""
    lines = text.split("\n")
    cleaned = []
    for line in lines:
        stripped = line.strip()
        # Standalone page numbers: "1", "- 2 -", "Page 3 of 10"
        if re.match(r"^[-–—]?\s*\d+\s*[-–—]?$", stripped):
            continue
        if re.match(r"^[Pp]age\s+\d+(\s+of\s+\d+)?$", stripped):
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


def _chunk_documents(
    pages: list[Document],
    doc_id: str,
    user_id: str,
    filename: str,
) -> list[Document]:
    """
    Chunk strategy:
    1. Clean each page (strip page-number noise).
    2. Merge all pages into one text with [PAGE N] boundary markers so the
       splitter can cross page boundaries — avoids stranding content at edges.
    3. Split with RecursiveCharacterTextSplitter using tiktoken so chunk_size
       and chunk_overlap are in tokens, not characters.
    4. Recover page_number for each chunk from the nearest [PAGE N] marker
       inside the chunk text, then strip the markers before storing.
    """
    # Step 1 + 2 — clean and merge
    parts = []
    for page in pages:
        cleaned = _clean_page_text(page.page_content)
        page_num = page.metadata.get("page_number", 1)
        parts.append(f"[PAGE {page_num}]\n{cleaned}")
    merged = "\n\n".join(parts)

    # Step 3 — split (token-aware via tiktoken cl100k_base = GPT-4 tokeniser)
    try:
        splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", " ", ""],
        )
    except Exception:
        # Fallback if tiktoken is unavailable (chars ≈ tokens × 4)
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000,
            chunk_overlap=800,
            separators=["\n\n", "\n", " ", ""],
        )
    raw_chunks = splitter.create_documents([merged])

    # Step 4 — recover page numbers, strip markers, build final Documents
    chunks: list[Document] = []
    for i, raw in enumerate(raw_chunks):
        text = raw.page_content
        # Last [PAGE N] marker in the chunk → page this content belongs to
        page_matches = list(re.finditer(r"\[PAGE (\d+)\]", text))
        page_number = int(page_matches[-1].group(1)) if page_matches else 1
        clean_text = re.sub(r"\[PAGE \d+\]\n?", "", text).strip()
        if not clean_text:
            continue
        chunks.append(
            Document(
                page_content=clean_text,
                metadata={
                    "doc_id": doc_id,
                    "user_id": user_id,
                    "chunk_index": i,
                    "filename": filename,
                    "page_number": page_number,
                },
            )
        )
    return chunks


def _normalise_conn_str(url: str) -> str:
    """Convert any postgres:// / postgresql:// URL to the postgresql+psycopg:// scheme
    required by langchain-postgres with psycopg3."""
    url = url.replace("postgres://", "postgresql://", 1)
    if "+psycopg" not in url:
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _store_vectors_sync(chunks: list[Document], embeddings: OpenAIEmbeddings, conn_str: str) -> None:
    vectorstore = PGVector(
        embeddings=embeddings,
        collection_name="documents",
        connection=conn_str,
        pre_delete_collection=False,
        use_jsonb=True,
    )
    vectorstore.add_documents(chunks)


# ---------------------------------------------------------------------------
# PDFIndexer
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Module-level singleton (initialised in main.py lifespan via init_indexer)
# ---------------------------------------------------------------------------

_indexer: "Optional[PDFIndexer]" = None


def init_indexer(embeddings: OpenAIEmbeddings) -> None:
    global _indexer
    _indexer = PDFIndexer(embeddings)


def get_indexer() -> "PDFIndexer":
    if _indexer is None:
        raise RuntimeError("PDFIndexer not initialised — call init_indexer() first")
    return _indexer


class PDFIndexer:
    """
    Indexes one PDF per call to .index(). Runs as a FastAPI BackgroundTask.
    Progress events are pushed to get_progress_queue(doc_id) so the SSE
    endpoint can stream them to the client.
    """

    def __init__(self, embeddings: OpenAIEmbeddings) -> None:
        self.embeddings = embeddings
        self._conn_str = _normalise_conn_str(settings.supabase_database_url)

    async def _push(self, doc_id: str, status: str, message: str) -> None:
        await get_progress_queue(doc_id).put({"status": status, "message": message})

    async def _set_doc_status(
        self,
        doc_id: str,
        status: str,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None,
    ) -> None:
        payload: dict = {"status": status}
        if page_count is not None:
            payload["page_count"] = page_count
        if chunk_count is not None:
            payload["chunk_count"] = chunk_count
        client = get_supabase_client()
        await client.table("documents").update(payload).eq("id", doc_id).execute()

    async def index(
        self,
        content: bytes,
        filename: str,
        doc_id: str,
        user_id: str,
        storage_path: str,
    ) -> None:
        try:
            # Step 1 — validate magic bytes before touching storage
            _validate_pdf(content)
            safe_name = _sanitize_filename(filename)

            # Step 2 — upload raw PDF to Supabase Storage
            await self._push(doc_id, "processing", "Uploading to storage…")
            client = get_supabase_client()
            await client.storage.from_("documents").upload(
                storage_path,
                content,
                {"content-type": "application/pdf"},
            )
            await client.table("documents").update(
                {"storage_path": storage_path}
            ).eq("id", doc_id).execute()

            # Step 3 — extract text (CPU-bound)
            await self._push(doc_id, "processing", "Extracting text…")
            pages = await asyncio.to_thread(_extract_pages, content, safe_name)
            page_count = len(pages)
            await self._set_doc_status(doc_id, "processing", page_count=page_count)

            # Step 4 — chunk (page-aware merge + recursive split)
            await self._push(doc_id, "processing", f"Chunking {page_count} pages…")
            chunks = await asyncio.to_thread(
                _chunk_documents, pages, doc_id, user_id, safe_name
            )
            chunk_count = len(chunks)

            # Step 5 — embed + write to PGVector (sync library → thread pool)
            await self._push(doc_id, "processing", f"Embedding {chunk_count} chunks…")
            await asyncio.to_thread(
                _store_vectors_sync, chunks, self.embeddings, self._conn_str
            )

            # Step 6 — mark document ready
            await self._set_doc_status(
                doc_id, "ready", page_count=page_count, chunk_count=chunk_count
            )
            await self._push(doc_id, "ready", "Indexing complete.")

        except Exception as exc:
            await self._set_doc_status(doc_id, "failed")
            await self._push(doc_id, "failed", str(exc))
            raise
        finally:
            # None sentinel tells the SSE generator to close the stream
            await get_progress_queue(doc_id).put(None)
