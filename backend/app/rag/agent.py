from typing import Literal, Optional, TypedDict

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langsmith import traceable
from langgraph.graph import END, StateGraph

from app.config import get_settings
from app.rag.grader import rerank_documents
from app.rag.retriever import HybridRetriever
from app.rag.rewriter import rewrite_query

settings = get_settings()

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------


class RAGState(TypedDict):
    query: str
    rewritten_query: str
    documents: list[Document]
    generation: str
    sources: list[dict]
    relevance_score: float
    retry_count: int
    max_retries: int
    user_id: str
    doc_ids: list[str]


# ---------------------------------------------------------------------------
# Module-level singletons  (initialised in main.py lifespan via init_agent)
# ---------------------------------------------------------------------------

_retriever: Optional[HybridRetriever] = None
_graph = None


def init_agent(embeddings: OpenAIEmbeddings) -> None:
    global _retriever, _graph
    _retriever = HybridRetriever(embeddings)
    _graph = _build_graph()


def get_rag_graph():
    if _graph is None:
        raise RuntimeError("RAG graph not initialised — call init_agent() first")
    return _graph


# ---------------------------------------------------------------------------
# Generate prompt + helpers
# ---------------------------------------------------------------------------

_GENERATE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a helpful assistant answering questions from uploaded documents.

Rules:
1. Answer ONLY using the provided context. Do not use outside knowledge.
2. If the context lacks sufficient information, say so clearly.
3. Cite every fact inline as [filename, p.N] referencing the filename and page number.
4. Be concise and direct.""",
        ),
        (
            "human",
            "Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
        ),
    ]
)

_generate_chain = None


def _get_generate_chain():
    global _generate_chain
    if _generate_chain is None:
        _generate_chain = _GENERATE_PROMPT | ChatOpenAI(
            model="gpt-4o", temperature=0, streaming=True
        )
    return _generate_chain


def _format_context(documents: list[Document]) -> str:
    parts = []
    for doc in documents:
        meta = doc.metadata
        filename = meta.get("filename", "document")
        page = meta.get("page_number", "?")
        parts.append(f"[{filename}, p.{page}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def _extract_sources(documents: list[Document]) -> list[dict]:
    seen: set[str] = set()
    sources: list[dict] = []
    for doc in documents:
        meta = doc.metadata
        key = f"{meta.get('doc_id', '')}:{meta.get('page_number', '')}"
        if key not in seen:
            seen.add(key)
            sources.append(
                {
                    "doc_id": meta.get("doc_id", ""),
                    "filename": meta.get("filename", ""),
                    "page_number": meta.get("page_number", 0),
                    "chunk_index": meta.get("chunk_index", 0),
                }
            )
    return sources


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------


@traceable(name="retrieve_node")
async def _retrieve(state: RAGState) -> dict:
    query = state.get("rewritten_query") or state["query"]
    documents = await _retriever.retrieve(
        query=query,
        user_id=state["user_id"],
        doc_ids=state["doc_ids"],
        k=settings.retrieval_k,
    )
    return {"documents": documents}


@traceable(name="generate_node")
async def generate_answer(state: RAGState) -> dict:
    query = state["query"]
    documents = state["documents"]
    context = _format_context(documents)
    sources = _extract_sources(documents)

    # streaming=True on the LLM means graph.astream_events() emits
    # on_chat_model_stream events for each token — consumed by the chat router.
    full_response = ""
    async for chunk in _get_generate_chain().astream({"query": query, "context": context}):
        full_response += chunk.content

    return {
        "generation": full_response,
        "sources": sources,
    }


@traceable(name="fallback_node")
async def generate_fallback(state: RAGState) -> dict:
    retries = state.get("retry_count", 0)
    message = (
        f'I couldn\'t find relevant information in your documents to answer: '
        f'"{state["query"]}"\n\n'
        f"Tried {retries} query reformulation(s). "
        "Please try rephrasing your question or check that the relevant documents are uploaded."
    )
    return {"generation": message, "sources": []}


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------


def should_retry_or_generate(
    state: RAGState,
) -> Literal["rewrite", "generate", "fallback"]:
    relevance_score: float = state.get("relevance_score", 0.0)
    retry_count: int = state.get("retry_count", 0)
    max_retries: int = state.get("max_retries", settings.max_retries)
    documents: list = state.get("documents", [])

    if relevance_score >= 0.3 and documents:
        return "generate"

    if retry_count < max_retries:
        return "rewrite"

    # Out of retries — generate from whatever we have, or fall back
    if documents:
        return "generate"

    return "fallback"


# ---------------------------------------------------------------------------
# Graph builder
# ---------------------------------------------------------------------------


def _build_graph():
    workflow = StateGraph(RAGState)

    workflow.add_node("retrieve", _retrieve)
    workflow.add_node("rerank", rerank_documents)
    workflow.add_node("rewrite", rewrite_query)
    workflow.add_node("generate", generate_answer)
    workflow.add_node("fallback", generate_fallback)

    workflow.set_entry_point("retrieve")
    workflow.add_edge("retrieve", "rerank")
    workflow.add_conditional_edges(
        "rerank",
        should_retry_or_generate,
        {
            "rewrite": "rewrite",
            "generate": "generate",
            "fallback": "fallback",
        },
    )
    workflow.add_edge("rewrite", "retrieve")
    workflow.add_edge("generate", END)
    workflow.add_edge("fallback", END)

    return workflow.compile()


# ---------------------------------------------------------------------------
# Convenience wrapper used by the chat router
# ---------------------------------------------------------------------------


@traceable(name="agentic_rag_invoke")
async def run_rag(
    query: str,
    user_id: str,
    doc_ids: list[str],
    max_retries: int | None = None,
) -> dict:
    """
    Invoke the RAG graph and return the final state.
    For SSE streaming, call get_rag_graph().astream_events(initial_state, version="v2")
    directly in the chat router and filter for on_chat_model_stream events.
    """
    initial_state: RAGState = {
        "query": query,
        "rewritten_query": "",
        "documents": [],
        "generation": "",
        "sources": [],
        "relevance_score": 0.0,
        "retry_count": 0,
        "max_retries": max_retries if max_retries is not None else settings.max_retries,
        "user_id": user_id,
        "doc_ids": doc_ids,
    }
    graph = get_rag_graph()
    return await graph.ainvoke(initial_state)
