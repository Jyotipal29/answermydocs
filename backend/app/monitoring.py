import json
import logging
import time
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Emit every log record as a single JSON line for log aggregation."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
        }
        if hasattr(record, "extra_data"):
            log_obj.update(record.extra_data)
        return json.dumps(log_obj)


def get_logger(name: str = "answermydocs") -> logging.Logger:
    """Return a JSON-structured logger. Safe to call multiple times — handlers are not duplicated."""
    from app.config import get_settings  # deferred to avoid import cycle at module init

    settings = get_settings()
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        logger.setLevel(getattr(logging, settings.log_level.upper(), logging.INFO))
    return logger


class MetricsCollector:
    """
    In-process metrics aggregator.
    Swap for prometheus_client.Counter / Histogram in production.
    """

    def __init__(self) -> None:
        self._requests_total = 0
        self._errors_total = 0
        self._latency_sum = 0.0
        self._latency_count = 0
        self._tokens_input = 0
        self._tokens_output = 0
        self._cache_hits = 0
        self._cache_misses = 0
        self._retrieval_attempts_total = 0
        self._fallbacks_total = 0

    def record_request(
        self,
        latency_ms: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
        error: bool = False,
        cache_hit: bool = False,
        retrieval_attempts: int = 0,
        fallback: bool = False,
    ) -> None:
        self._requests_total += 1
        self._latency_sum += latency_ms
        self._latency_count += 1
        self._tokens_input += input_tokens
        self._tokens_output += output_tokens
        self._retrieval_attempts_total += retrieval_attempts
        if error:
            self._errors_total += 1
        if cache_hit:
            self._cache_hits += 1
        else:
            self._cache_misses += 1
        if fallback:
            self._fallbacks_total += 1

    @property
    def summary(self) -> dict:
        avg_latency = (
            self._latency_sum / self._latency_count if self._latency_count > 0 else 0.0
        )
        error_rate = (
            self._errors_total / self._requests_total if self._requests_total > 0 else 0.0
        )
        cache_total = self._cache_hits + self._cache_misses
        cache_hit_rate = self._cache_hits / cache_total if cache_total > 0 else 0.0
        return {
            "total_requests": self._requests_total,
            "total_errors": self._errors_total,
            "error_rate": round(error_rate, 4),
            "avg_latency_ms": round(avg_latency, 2),
            "cache_hit_rate": round(cache_hit_rate, 4),
            "total_tokens_in": self._tokens_input,
            "total_tokens_out": self._tokens_output,
            "retrieval_attempts": self._retrieval_attempts_total,
            "fallbacks": self._fallbacks_total,
        }


class RequestTimer:
    """Context manager for timing a block. Read .elapsed_ms after the with-block."""

    def __enter__(self) -> "RequestTimer":
        self._start = time.time()
        return self

    def __exit__(self, *args: object) -> None:
        self.elapsed_ms = (time.time() - self._start) * 1000
