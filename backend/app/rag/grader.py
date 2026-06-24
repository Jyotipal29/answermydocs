import asyncio

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langsmith import traceable

from app.config import get_settings

settings = get_settings()

_GRADING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a retrieval relevance grader for a document Q&A system.
Your job is to decide whether a document chunk is USEFUL for helping answer a user's question.

Important: a chunk is relevant if it contains ANY information that would help compose an answer,
even if it does not directly state the final answer. For example:
- A query "what is Jyoti's total work experience?" is helped by ANY chunk that shows a job title,
  employer, or date range — because the answer can be computed from those pieces.
- A chunk does NOT need to say "total experience = 3 years" to be relevant.

Output ONLY a single decimal number between 0 and 1:
1.0 — chunk directly contains the answer or key facts needed to answer
0.7 — chunk contains information helpful for composing the answer
0.3 — chunk is loosely related to the topic but unlikely to help
0.0 — chunk is completely unrelated to the query topic

Output the number only. No explanation.""",
        ),
        (
            "human",
            "Query: {query}\n\nDocument chunk:\n{document}\n\nRelevance score (0-1):",
        ),
    ]
)

_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _GRADING_PROMPT | ChatOpenAI(model="gpt-4o-mini", temperature=0)
    return _chain


async def _score_doc(query: str, doc) -> float:
    result = await _get_chain().ainvoke({"query": query, "document": doc.page_content})
    raw = result.content if isinstance(result.content, str) else str(result.content)
    try:
        score = float(raw.strip())
        return max(0.0, min(1.0, score))
    except (ValueError, AttributeError):
        return 0.5


@traceable(name="rerank_node")
async def rerank_documents(state: dict) -> dict:
    """
    LangGraph node: score all retrieved documents in parallel, sort by score,
    and return the top rerank_top_k docs. Replaces the old filter-mode grader.
    """
    query: str = state["query"]
    documents: list = state.get("documents", [])

    if not documents:
        return {"documents": [], "relevance_score": 0.0}

    # Score all docs in parallel (one gpt-4o-mini call per doc, concurrent)
    scores = await asyncio.gather(*[_score_doc(query, doc) for doc in documents])

    # Sort descending by score, keep top rerank_top_k
    pairs = sorted(zip(scores, documents), key=lambda x: x[0], reverse=True)
    top_docs = [doc for _, doc in pairs[: settings.rerank_top_k]]
    max_score = pairs[0][0] if pairs else 0.0

    return {"documents": top_docs, "relevance_score": max_score}
