CREATE TABLE IF NOT EXISTS documents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename        TEXT        NOT NULL,
    storage_path    TEXT,
    page_count      INT,
    chunk_count     INT,
    file_size_bytes INT         NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'uploading'
                                CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_user_id_idx    ON documents (user_id);
CREATE INDEX IF NOT EXISTS documents_user_status_idx ON documents (user_id, status);
