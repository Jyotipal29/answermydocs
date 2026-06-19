from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langsmith import traceable

_REWRITE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a search query optimizer for a document Q&A system.
The original query did not retrieve sufficiently relevant document chunks.

Rewrite the query to improve retrieval. Consider:
- Adding synonyms or domain-specific terms
- Being more specific about the information needed
- Phrasing the query to match how technical documentation is written
- Breaking a compound question into its most searchable component

Output ONLY the rewritten query. No explanation, no preamble.""",
        ),
        (
            "human",
            "Original query: {query}\n\nRewritten query:",
        ),
    ]
)

_chain = None


def _get_chain():
    global _chain
    if _chain is None:
        _chain = _REWRITE_PROMPT | ChatOpenAI(model="gpt-4o-mini", temperature=0.3)
    return _chain


@traceable(name="rewrite_node")
async def rewrite_query(state: dict) -> dict:
    """
    LangGraph node: rewrite the query to improve retrieval on the next attempt.
    Increments retry_count. The graph routes back to retrieve after this node.
    """
    query: str = state["query"]
    retry_count: int = state.get("retry_count", 0)

    result = await _get_chain().ainvoke({"query": query})
    rewritten = result.content.strip()

    return {
        "rewritten_query": rewritten,
        "retry_count": retry_count + 1,
    }
