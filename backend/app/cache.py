import hashlib
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class _Entry:
    response: str
    sources: list
    doc_ids: frozenset
    timestamp: float
    ttl: int


class ResponseCache:
    """
    In-memory response cache scoped per user + document set + query.

    Key is SHA-256(user_id : sorted(doc_ids) : normalised_query) so two users
    with identical queries against different document sets never share a cached
    answer (cross-user collision fix vs. the single-tenant reference).

    Swap _cache for a Redis client to make this distributed with one change.
    """

    def __init__(self) -> None:
        self._cache: dict[str, _Entry] = {}
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _make_key(user_id: str, doc_ids: list[str], query: str) -> str:
        doc_part = ":".join(sorted(doc_ids))
        payload = f"{user_id}:{doc_part}:{query.lower().strip()}"
        return hashlib.sha256(payload.encode()).hexdigest()

    def get(
        self, user_id: str, doc_ids: list[str], query: str
    ) -> Optional[tuple[str, list]]:
        """Return (response, sources) on hit, None on miss or expiry."""
        key = self._make_key(user_id, doc_ids, query)
        entry = self._cache.get(key)
        if entry is not None:
            if time.time() - entry.timestamp < entry.ttl:
                self._hits += 1
                return entry.response, entry.sources
            del self._cache[key]
        self._misses += 1
        return None

    def set(
        self,
        user_id: str,
        doc_ids: list[str],
        query: str,
        response: str,
        sources: list,
        ttl: int = 300,
    ) -> None:
        """
        Store a completed response + its sources.
        Call this after the [SOURCES] SSE event is emitted so the buffer
        is fully accumulated before caching.
        ttl — pass settings.cache_ttl_pro_seconds for pro users.
        """
        key = self._make_key(user_id, doc_ids, query)
        self._cache[key] = _Entry(
            response=response,
            sources=sources,
            doc_ids=frozenset(doc_ids),
            timestamp=time.time(),
            ttl=ttl,
        )

    def invalidate_by_doc(self, doc_id: str) -> int:
        """
        Remove every entry that references doc_id.
        Call on document delete so stale answers are not served.
        Returns the number of entries evicted.
        """
        keys = [k for k, e in self._cache.items() if doc_id in e.doc_ids]
        for k in keys:
            del self._cache[k]
        return len(keys)

    @property
    def stats(self) -> dict:
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0.0
        now = time.time()
        active = sum(1 for e in self._cache.values() if now - e.timestamp < e.ttl)
        return {
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": round(hit_rate, 4),
            "size": active,
        }
