from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langsmith import traceable

_GRADING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are a retrieval relevance grader for a document Q&A system.
Given a user query and a document chunk, decide how relevant the chunk is.

Output ONLY a single decimal number between 0 and 1:
1.0 — chunk directly answers the query
0.7 — chunk contains closely related information
0.3 — chunk is tangentially related
0.0 — chunk is unrelated

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


@traceable(name="grade_node")
async def grade_documents(state: dict) -> dict:
    """
    LangGraph node: grade each retrieved chunk for relevance to the query.
    Returns filtered documents (score >= 0.5) and the average relevance score.
    """
    query: str = state["query"]
    documents: list = state.get("documents", [])

    if not documents:
        return {"documents": [], "relevance_score": 0.0}

    scores: list[float] = []
    relevant_docs = []

    for doc in documents:
        result = await _get_chain().ainvoke(
            {"query": query, "document": doc.page_content}
        )
        try:
            score = float(result.content.strip())
            score = max(0.0, min(1.0, score))  # clamp to [0, 1]
        except ValueError:
            score = 0.5

        scores.append(score)
        if score >= 0.5:
            relevant_docs.append(doc)

    avg_score = sum(scores) / len(scores)
    return {"documents": relevant_docs, "relevance_score": avg_score}
