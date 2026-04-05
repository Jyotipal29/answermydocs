from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.config import QDRANT_URL, QDRANT_API_KEY, EMBEDDING_MODEL, RETRIEVER_TOP_K

_embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)
_VECTOR_SIZE = 1536  # text-embedding-3-small output dimension

_qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)


def _ensure_collection(collection_name: str):
    if not _qdrant_client.collection_exists(collection_name):
        _qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=_VECTOR_SIZE, distance=Distance.COSINE),
        )


def _get_store(collection_name: str) -> QdrantVectorStore:
    _ensure_collection(collection_name)
    return QdrantVectorStore(
        client=_qdrant_client,
        collection_name=collection_name,
        embedding=_embeddings,
    )


def add_documents(collection_name: str, chunks: list[Document]) -> int:
    store = _get_store(collection_name)
    store.add_documents(chunks)
    return len(chunks)


def retrieve(collection_name: str, query: str, top_k: int = RETRIEVER_TOP_K) -> list[Document]:
    store = _get_store(collection_name)
    return store.similarity_search(query, k=top_k)


def delete_collection(collection_name: str):
    try:
        _qdrant_client.delete_collection(collection_name)
    except Exception:
        pass
