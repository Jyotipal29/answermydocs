-- Run this migration AFTER the first PGVector.from_documents() call,
-- which creates the langchain_pg_embedding table managed by langchain-postgres.

CREATE INDEX IF NOT EXISTS langchain_pg_embedding_hnsw_idx
    ON langchain_pg_embedding
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- GIN index for fast JSONB metadata filtering (user_id, doc_id lookups)
CREATE INDEX IF NOT EXISTS langchain_pg_embedding_cmetadata_idx
    ON langchain_pg_embedding
    USING gin (cmetadata);
