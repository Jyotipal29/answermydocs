from collections.abc import AsyncIterator

from langchain_core.documents import Document
from langchain_core.messages import AIMessageChunk, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI

from app.config import LLM_MODEL

_llm = ChatOpenAI(model=LLM_MODEL, streaming=True)

SYSTEM_PROMPT = (
    "You are a helpful assistant that answers questions based on the provided document context. "
    "Use the context below to answer the user's question. If the context doesn't contain "
    "enough information to answer, say so honestly. Do not make up information.\n\n"
    "Context:\n{context}"
)


def _format_context(documents: list[Document]) -> str:
    return "\n\n---\n\n".join(doc.page_content for doc in documents)


def _build_messages(
    question: str,
    context_docs: list[Document],
    chat_history: list[dict[str, str]],
) -> list:
    context = _format_context(context_docs)
    messages: list = [SystemMessage(content=SYSTEM_PROMPT.format(context=context))]

    for msg in chat_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=question))
    return messages


async def stream_response(
    question: str,
    context_docs: list[Document],
    chat_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    messages = _build_messages(question, context_docs, chat_history)
    async for chunk in _llm.astream(messages):
        if isinstance(chunk, AIMessageChunk) and chunk.content:
            yield chunk.content
