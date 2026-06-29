-- Change conversations.document_id FK from ON DELETE SET NULL to ON DELETE CASCADE
-- so that deleting a document automatically removes all its conversations and messages.
ALTER TABLE conversations
  DROP CONSTRAINT IF EXISTS conversations_document_id_fkey;

ALTER TABLE conversations
  ADD CONSTRAINT conversations_document_id_fkey
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE;
