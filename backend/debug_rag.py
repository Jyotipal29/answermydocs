"""
Standalone Gradio debug UI for the AnswerMyDocs RAG pipeline.

Usage:
    cd backend
    uv run --group dev python debug_rag.py

Inputs (in the browser):
    - Query           : the question to ask
    - User ID         : your Supabase user UUID
    - Document IDs    : comma-separated document UUIDs to search against

The answer is displayed in the browser.
The full pipeline trace (retrieve → grade → router → rewrite → generate/fallback)
is printed to THIS terminal so you can scroll and inspect each step.
"""

import asyncio
import os
import sys
from pathlib import Path

# Allow `from app.xxx import ...` when run from the backend/ directory.
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import gradio as gr
from langchain_openai import OpenAIEmbeddings

from app.config import get_settings
from app.db.client import close_supabase, init_supabase
from app.rag.agent import init_agent, run_rag
from app.rag.indexer import init_indexer

settings = get_settings()
_initialized = False


async def _ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return

    os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langchain_api_key)
    os.environ.setdefault("LANGCHAIN_TRACING_V2", str(settings.langchain_tracing_v2).lower())
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langchain_project)

    print("[DEBUG UI] Connecting to Supabase…")
    await init_supabase()

    print("[DEBUG UI] Initialising embeddings and RAG agent…")
    embeddings = OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.openai_api_key,
    )
    init_agent(embeddings)
    init_indexer(embeddings)

    _initialized = True
    print("[DEBUG UI] ✓ Pipeline ready\n")


async def query_pipeline(query: str, user_id: str, doc_ids_raw: str) -> str:
    await _ensure_initialized()

    query = query.strip()
    user_id = user_id.strip()
    doc_ids = [d.strip() for d in doc_ids_raw.split(",") if d.strip()]

    if not query:
        return "⚠️  Please enter a query."
    if not user_id:
        return "⚠️  Please enter your user ID."
    if not doc_ids:
        return "⚠️  Please enter at least one document ID."

    print(f"\n{'═'*60}")
    print(f"[DEBUG UI] New request")
    print(f"[DEBUG UI] user_id  : {user_id}")
    print(f"[DEBUG UI] doc_ids  : {doc_ids}")
    print(f"[DEBUG UI] query    : {query!r}")
    print(f"{'═'*60}")

    try:
        result = await run_rag(query=query, user_id=user_id, doc_ids=doc_ids)
    except Exception as exc:
        print(f"[DEBUG UI] ❌ Exception: {exc}")
        return f"Error: {exc}"

    generation = result.get("generation", "(no generation)")
    sources = result.get("sources", [])

    print(f"\n[DEBUG UI] ✓ Final answer ({len(generation)} chars)")
    if sources:
        src_labels = [f"{s.get('filename', '?')} p.{s.get('page_number', '?')}" for s in sources]
        print(f"[DEBUG UI] Sources: {src_labels}")
    else:
        print("[DEBUG UI] Sources: none")

    return generation


demo = gr.Interface(
    fn=query_pipeline,
    inputs=[
        gr.Textbox(
            label="Query",
            placeholder="Ask a question about your uploaded documents…",
            lines=2,
        ),
        gr.Textbox(
            label="User ID",
            placeholder="Your Supabase user UUID (e.g. 550e8400-e29b-41d4-a716-446655440000)",
        ),
        gr.Textbox(
            label="Document IDs (comma-separated)",
            placeholder="uuid1, uuid2, …",
        ),
    ],
    outputs=gr.Textbox(label="Answer", lines=10),
    title="AnswerMyDocs — RAG Debug UI",
    description=(
        "Test the RAG pipeline directly. "
        "The answer appears here; the full pipeline trace (retrieve / grade / router / rewrite / generate) "
        "prints to the terminal where you launched this script."
    ),
    flagging_mode="never",
)

if __name__ == "__main__":
    demo.launch()
