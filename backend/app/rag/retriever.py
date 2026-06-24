import asyncio
from math import log

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

from app.config import get_settings
from app.db.client import get_pg_connection
from app.rag.indexer import _normalise_conn_str

settings = get_settings()

# ---------------------------------------------------------------------------
# BM25 corpus cache  (keyed by frozenset of doc_ids)
# ---------------------------------------------------------------------------

_bm25_cache: dict[tuple, tuple[list[list[str]], list[Document]]] = {}


def _tokenise(text: str) -> list[str]:
    return text.lower().split()


# ---------------------------------------------------------------------------
# Minimal Okapi BM25 (no external dependency)
# ---------------------------------------------------------------------------


class _BM25:
    def __init__(self, corpus: list[list[str]], k1: float = 1.5, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b
        self.corpus = corpus
        N = len(corpus)
        self.avgdl = sum(len(d) for d in corpus) / N if N else 1.0
        df: dict[str, int] = {}
        for doc in corpus:
            for term in set(doc):
                df[term] = df.get(term, 0) + 1
        self.idf: dict[str, float] = {
            term: log((N - freq + 0.5) / (freq + 0.5) + 1)
            for term, freq in df.items()
        }

    def get_scores(self, query_terms: list[str]) -> list[float]:
        scores: list[float] = []
        for doc in self.corpus:
            dl = len(doc)
            tf_map: dict[str, int] = {}
            for t in doc:
                tf_map[t] = tf_map.get(t, 0) + 1
            score = 0.0
            for term in query_terms:
                if term not in self.idf:
                    continue
                tf = tf_map.get(term, 0)
                score += (
                    self.idf[term]
                    * tf
                    * (self.k1 + 1)
                    / (tf + self.k1 * (1 - self.b + self.b * dl / self.avgdl))
                )
            scores.append(score)
        return scores


# ---------------------------------------------------------------------------
# BM25 corpus builder  (raw psycopg3 SQL — reference Chroma pattern unusable)
# ---------------------------------------------------------------------------


async def _build_bm25_corpus(
    user_id: str, doc_ids: list[str]
) -> tuple[list[list[str]], list[Document]]:
    cache_key = (user_id, frozenset(doc_ids))
    if cache_key in _bm25_cache:
        return _bm25_cache[cache_key]

    async with get_pg_connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT document, cmetadata
                FROM langchain_pg_embedding
                WHERE cmetadata->>'user_id' = %s
                  AND cmetadata->>'doc_id' = ANY(%s)
                """,
                (user_id, doc_ids),
            )
            rows = await cur.fetchall()

    tokenised: list[list[str]] = []
    raw_docs: list[Document] = []
    for text, metadata in rows:
        tokenised.append(_tokenise(text))
        raw_docs.append(Document(page_content=text, metadata=metadata))

    _bm25_cache[cache_key] = (tokenised, raw_docs)
    return tokenised, raw_docs


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion
# ---------------------------------------------------------------------------


def _doc_key(doc: Document) -> str:
    m = doc.metadata
    return f"{m.get('doc_id', '')}:{m.get('chunk_index', '')}:{m.get('page_number', '')}"


def _rrf_fuse(
    vector_docs: list[Document],
    bm25_docs: list[Document],
    rrf_k: int = 60,
    w_vector: float = 0.5,
    w_bm25: float = 0.5,
    top_k: int = 6,
) -> list[Document]:
    scores: dict[str, float] = {}
    all_docs: dict[str, Document] = {}

    for rank, doc in enumerate(vector_docs):
        key = _doc_key(doc)
        scores[key] = scores.get(key, 0.0) + w_vector / (rrf_k + rank + 1)
        all_docs[key] = doc

    for rank, doc in enumerate(bm25_docs):
        key = _doc_key(doc)
        scores[key] = scores.get(key, 0.0) + w_bm25 / (rrf_k + rank + 1)
        all_docs[key] = doc

    ranked = sorted(scores, key=lambda k: scores[k], reverse=True)
    return [all_docs[k] for k in ranked[:top_k]]


# ---------------------------------------------------------------------------
# HybridRetriever
# ---------------------------------------------------------------------------


class HybridRetriever:
    """
    Hybrid search: vector (PGVector cosine) + BM25 fused with RRF.
    Filtered by user_id + doc_ids so users only see their own chunks.
    BM25 corpus is cached by frozenset(doc_ids) — rebuilt only when the
    document set changes.
    """

    def __init__(self, embeddings: OpenAIEmbeddings) -> None:
        self.embeddings = embeddings
        self._conn_str = _normalise_conn_str(settings.supabase_database_url)

    def _make_vectorstore(self) -> PGVector:
        return PGVector(
            embeddings=self.embeddings,
            collection_name="documents",
            connection=self._conn_str,
            pre_delete_collection=False,
            use_jsonb=True,
        )

    def _vector_search_sync(
        self, query: str, user_id: str, doc_ids: list[str], k: int
    ) -> list[Document]:
        vs = self._make_vectorstore()
        return vs.similarity_search(
            query,
            k=k,
            filter={
                "$and": [
                    {"user_id": {"$eq": user_id}},
                    {"doc_id": {"$in": doc_ids}},
                ]
            },
        )

    async def retrieve(
        self,
        query: str,
        user_id: str,
        doc_ids: list[str],
        k: int = 6,
    ) -> list[Document]:
        """Return up to k chunks fused from vector + BM25 search."""
        candidate_k = k * 2  # over-fetch before RRF pruning

        vector_docs = await asyncio.to_thread(
            self._vector_search_sync, query, user_id, doc_ids, candidate_k
        )

        tokenised_corpus, raw_corpus_docs = await _build_bm25_corpus(user_id, doc_ids)

        if tokenised_corpus:
            bm25 = _BM25(tokenised_corpus)
            bm25_scores = bm25.get_scores(_tokenise(query))
            top_indices = sorted(
                range(len(bm25_scores)),
                key=lambda i: bm25_scores[i],
                reverse=True,
            )[:candidate_k]
            bm25_docs = [raw_corpus_docs[i] for i in top_indices]
        else:
            bm25_docs = []

        return _rrf_fuse(vector_docs, bm25_docs, top_k=k)

    def invalidate_bm25_cache(self, doc_id: str) -> None:
        """Evict every cached corpus that references doc_id. Call on document delete."""
        stale = [key for key in _bm25_cache if doc_id in key[1]]
        for key in stale:
            del _bm25_cache[key]
