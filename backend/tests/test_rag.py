import pytest
from langchain_core.documents import Document

from app.rag.retriever import _BM25, _doc_key, _rrf_fuse, _tokenise


class TestTokenise:
    def test_lowercases(self):
        assert _tokenise("Hello World") == ["hello", "world"]

    def test_splits_on_whitespace(self):
        assert _tokenise("one two three") == ["one", "two", "three"]

    def test_empty_string(self):
        assert _tokenise("") == []


class TestBM25:
    def _make_corpus(self):
        return [
            _tokenise("the quick brown fox"),
            _tokenise("the fox jumped over the lazy dog"),
            _tokenise("hello world python programming"),
        ]

    def test_relevant_doc_scores_higher(self):
        corpus = self._make_corpus()
        bm25 = _BM25(corpus)
        scores = bm25.get_scores(_tokenise("fox"))
        # Both docs 0 and 1 mention fox; doc 2 doesn't
        assert scores[2] == 0.0
        assert scores[0] > 0 or scores[1] > 0

    def test_exact_term_match_scores_positive(self):
        corpus = self._make_corpus()
        bm25 = _BM25(corpus)
        scores = bm25.get_scores(_tokenise("python"))
        assert scores[2] > 0.0
        assert scores[0] == 0.0
        assert scores[1] == 0.0

    def test_unknown_term_scores_zero(self):
        corpus = self._make_corpus()
        bm25 = _BM25(corpus)
        scores = bm25.get_scores(_tokenise("zzznomatch"))
        assert all(s == 0.0 for s in scores)

    def test_scores_length_matches_corpus(self):
        corpus = self._make_corpus()
        bm25 = _BM25(corpus)
        scores = bm25.get_scores(_tokenise("fox"))
        assert len(scores) == len(corpus)

    def test_empty_corpus(self):
        bm25 = _BM25([])
        assert bm25.get_scores(["anything"]) == []


def _make_doc(doc_id: str, chunk_index: int, page: int, content: str = "text") -> Document:
    return Document(
        page_content=content,
        metadata={
            "doc_id": doc_id,
            "chunk_index": chunk_index,
            "page_number": page,
            "filename": "test.pdf",
            "user_id": "user1",
        },
    )


class TestDocKey:
    def test_key_uses_doc_id_chunk_page(self):
        doc = _make_doc("abc", 2, 5)
        assert _doc_key(doc) == "abc:2:5"

    def test_different_docs_different_keys(self):
        d1 = _make_doc("doc1", 0, 1)
        d2 = _make_doc("doc2", 0, 1)
        assert _doc_key(d1) != _doc_key(d2)


class TestRRFFuse:
    def test_top_k_respected(self):
        vector_docs = [_make_doc("d", i, i) for i in range(6)]
        bm25_docs = [_make_doc("d", i, i) for i in range(6)]
        result = _rrf_fuse(vector_docs, bm25_docs, top_k=3)
        assert len(result) == 3

    def test_deduplication_on_same_chunk(self):
        doc = _make_doc("d1", 0, 1)
        result = _rrf_fuse([doc], [doc], top_k=5)
        assert len(result) == 1

    def test_higher_ranked_appears_first(self):
        high = _make_doc("d1", 0, 1, "highly relevant")
        low = _make_doc("d2", 0, 1, "less relevant")
        # high ranks #1 in both lists, low ranks #2 in both
        result = _rrf_fuse([high, low], [high, low], top_k=2)
        assert _doc_key(result[0]) == _doc_key(high)

    def test_empty_vector_uses_bm25_only(self):
        docs = [_make_doc("d", i, i) for i in range(3)]
        result = _rrf_fuse([], docs, top_k=3)
        assert len(result) == 3

    def test_empty_bm25_uses_vector_only(self):
        docs = [_make_doc("d", i, i) for i in range(3)]
        result = _rrf_fuse(docs, [], top_k=3)
        assert len(result) == 3

    def test_both_empty_returns_empty(self):
        assert _rrf_fuse([], [], top_k=6) == []
