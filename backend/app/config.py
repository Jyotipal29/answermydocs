from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    primary_model: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_database_url: str

    # LangSmith
    langchain_api_key: str = ""
    langchain_tracing_v2: bool = True
    langchain_project: str = "answermydocs"

    # JWT auth
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days

    # Google OAuth
    google_client_id: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_pro_price_id: str = ""  # Price ID from Stripe dashboard (e.g. price_xxx)

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    frontend_url: str = "http://localhost:3000"

    # Cache
    cache_ttl_seconds: int = 300
    cache_ttl_pro_seconds: int = 600

    # RAG
    max_retries: int = 2
    retrieval_k: int = 20   # candidates retrieved + RRF-fused before reranking
    rerank_top_k: int = 8   # docs kept after reranking, passed to the LLM

    # Rate limits (SlowAPI format)
    rate_limit_free: str = "20/minute"
    rate_limit_pro: str = "100/minute"

    # Usage limits — free tier
    max_docs_free: int = 5
    max_pdf_size_free_mb: int = 10
    max_pdf_size_pro_mb: int = 100
    max_storage_free_mb: int = 50
    max_storage_pro_mb: int = 5120  # 5 GB
    max_messages_free_monthly: int = 100

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def max_pdf_bytes_free(self) -> int:
        return self.max_pdf_size_free_mb * 1024 * 1024

    @property
    def max_pdf_bytes_pro(self) -> int:
        return self.max_pdf_size_pro_mb * 1024 * 1024

    @property
    def max_storage_bytes_free(self) -> int:
        return self.max_storage_free_mb * 1024 * 1024

    @property
    def max_storage_bytes_pro(self) -> int:
        return self.max_storage_pro_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()
