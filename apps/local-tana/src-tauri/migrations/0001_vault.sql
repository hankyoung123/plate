CREATE TABLE IF NOT EXISTS vault_document (
  vault_id TEXT PRIMARY KEY NOT NULL,
  schema_version INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS node_fts USING fts5(
  vault_id UNINDEXED,
  node_id UNINDEXED,
  body
);
