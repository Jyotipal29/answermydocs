CREATE TABLE IF NOT EXISTS conversations (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
    workspace_id UUID                 REFERENCES workspaces(id) ON DELETE SET NULL,
    document_id  UUID                 REFERENCES documents(id)  ON DELETE SET NULL,
    title        TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_user_id_idx      ON conversations (user_id);
CREATE INDEX IF NOT EXISTS conversations_workspace_id_idx ON conversations (workspace_id);
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx   ON conversations (user_id, updated_at DESC);
