from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from app.config import CHROMA_PERSIST_DIR, EMBEDDING_MODEL, RETRIEVER_TOP_K

_embeddings = OpenAIEmbeddings(model=EMBEDDING_MODEL)


def _get_store(collection_name: str) -> Chroma:
    return Chroma(
        collection_name=collection_name,
        embedding_function=_embeddings,
        persist_directory=CHROMA_PERSIST_DIR,
    )


def add_documents(collection_name: str, chunks: list[Document]) -> int:
    store = _get_store(collection_name)
    store.add_documents(chunks)
    return len(chunks)


def retrieve(collection_name: str, query: str, top_k: int = RETRIEVER_TOP_K) -> list[Document]:
    store = _get_store(collection_name)
    return store.similarity_search(query, k=top_k)


def delete_collection(collection_name: str):
    import chromadb
    client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
    try:
        client.delete_collection(collection_name)
    except ValueError:
        pass
