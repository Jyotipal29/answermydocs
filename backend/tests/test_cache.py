import time

import pytest

from app.cache import ResponseCache


@pytest.fixture
def cache():
    return ResponseCache()


class TestResponseCacheBasics:
    def test_miss_returns_none(self, cache):
        assert cache.get("user1", ["doc1"], "what is this?") is None

    def test_set_then_get_returns_value(self, cache):
        cache.set("user1", ["doc1"], "What is this?", "It is a contract.", [], ttl=300)
        result = cache.get("user1", ["doc1"], "What is this?")
        assert result is not None
        response, sources = result
        assert response == "It is a contract."
        assert sources == []

    def test_normalisation_lowercases_query(self, cache):
        cache.set("user1", ["doc1"], "What Is This?", "answer", [], ttl=300)
        result = cache.get("user1", ["doc1"], "what is this?")
        assert result is not None

    def test_normalisation_strips_whitespace(self, cache):
        cache.set("user1", ["doc1"], "  hello  ", "answer", [], ttl=300)
        result = cache.get("user1", ["doc1"], "hello")
        assert result is not None

    def test_sources_round_trip(self, cache):
        sources = [{"doc_id": "d1", "filename": "f.pdf", "page_number": 3, "chunk_index": 0}]
        cache.set("user1", ["doc1"], "query", "answer", sources, ttl=300)
        _, returned_sources = cache.get("user1", ["doc1"], "query")
        assert returned_sources == sources


class TestCacheScopingIsolation:
    def test_different_users_same_query_isolated(self, cache):
        cache.set("user1", ["doc1"], "query", "answer for user1", [], ttl=300)
        assert cache.get("user2", ["doc1"], "query") is None

    def test_same_user_different_docs_isolated(self, cache):
        cache.set("user1", ["doc1"], "query", "answer with doc1", [], ttl=300)
        assert cache.get("user1", ["doc2"], "query") is None

    def test_doc_order_does_not_matter(self, cache):
        cache.set("user1", ["doc2", "doc1"], "query", "answer", [], ttl=300)
        result = cache.get("user1", ["doc1", "doc2"], "query")
        assert result is not None

    def test_different_queries_isolated(self, cache):
        cache.set("user1", ["doc1"], "query A", "answer A", [], ttl=300)
        assert cache.get("user1", ["doc1"], "query B") is None


class TestCacheTTL:
    def test_expired_entry_returns_none(self, cache):
        cache.set("user1", ["doc1"], "query", "answer", [], ttl=1)
        time.sleep(1.1)
        assert cache.get("user1", ["doc1"], "query") is None

    def test_unexpired_entry_returned(self, cache):
        cache.set("user1", ["doc1"], "query", "answer", [], ttl=300)
        assert cache.get("user1", ["doc1"], "query") is not None


class TestCacheInvalidation:
    def test_invalidate_by_doc_removes_matching_entries(self, cache):
        cache.set("user1", ["doc1", "doc2"], "q1", "a1", [], ttl=300)
        cache.set("user1", ["doc1"], "q2", "a2", [], ttl=300)
        cache.set("user1", ["doc3"], "q3", "a3", [], ttl=300)

        removed = cache.invalidate_by_doc("doc1")
        assert removed == 2
        assert cache.get("user1", ["doc1", "doc2"], "q1") is None
        assert cache.get("user1", ["doc1"], "q2") is None
        assert cache.get("user1", ["doc3"], "q3") is not None

    def test_invalidate_nonexistent_doc_returns_zero(self, cache):
        assert cache.invalidate_by_doc("nonexistent") == 0


class TestCacheStats:
    def test_stats_shape(self, cache):
        stats = cache.stats
        assert "hits" in stats
        assert "misses" in stats
        assert "hit_rate" in stats
        assert "size" in stats

    def test_hit_rate_calculation(self, cache):
        cache.set("u", ["d"], "q", "a", [], ttl=300)
        cache.get("u", ["d"], "q")   # hit
        cache.get("u", ["d"], "miss")  # miss
        assert cache.stats["hits"] == 1
        assert cache.stats["misses"] == 1
        assert cache.stats["hit_rate"] == 0.5

    def test_size_excludes_expired(self, cache):
        cache.set("u", ["d"], "fresh", "a", [], ttl=300)
        cache.set("u", ["d"], "stale", "b", [], ttl=1)
        time.sleep(1.1)
        # Trigger expiry detection via a get
        cache.get("u", ["d"], "stale")
        assert cache.stats["size"] == 1
