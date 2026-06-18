CREATE TABLE IF NOT EXISTS workspaces (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workspaces_user_id_idx ON workspaces (user_id);

CREATE TABLE IF NOT EXISTS workspace_documents (
    workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id  UUID        NOT NULL REFERENCES documents(id)  ON DELETE CASCADE,
    added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, document_id)
);

CREATE INDEX IF NOT EXISTS workspace_documents_doc_idx ON workspace_documents (document_id);
