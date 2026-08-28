import {
  buildTanaIndex,
  createStarterDocument,
  ensureNodeCatalog,
  nodeText,
  type TanaDocument,
} from '@platejs/tana';

export type VaultRecord = Readonly<{
  document: TanaDocument;
  schemaVersion: number;
  updatedAt: string;
  vaultId: string;
}>;

export interface PersistenceAdapter {
  readonly kind: 'browser' | 'sqlite';
  load(vaultId: string): Promise<VaultRecord | null>;
  save(record: VaultRecord): Promise<void>;
}

const STORAGE_PREFIX = 'local-tana:vault:';
const CURRENT_SCHEMA_VERSION = 2;

class BrowserPersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'browser' as const;

  async load(vaultId: string) {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${vaultId}`);
    return value ? (JSON.parse(value) as VaultRecord) : null;
  }

  async save(record: VaultRecord) {
    localStorage.setItem(
      `${STORAGE_PREFIX}${record.vaultId}`,
      JSON.stringify(record)
    );
  }
}

class SQLitePersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'sqlite' as const;
  private database?: Awaited<ReturnType<typeof this.connect>>;

  private async connect() {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    return Database.load('sqlite:local-tana.db');
  }

  private async db() {
    this.database ??= await this.connect();
    return this.database;
  }

  async load(vaultId: string): Promise<VaultRecord | null> {
    const db = await this.db();
    const rows = await db.select<
      Array<{
        document_json: string;
        schema_version: number;
        updated_at: string;
        vault_id: string;
      }>
    >(
      'SELECT vault_id, schema_version, document_json, updated_at FROM vault_document WHERE vault_id = $1',
      [vaultId]
    );
    const row = rows[0];
    return row
      ? {
          document: JSON.parse(row.document_json) as TanaDocument,
          schemaVersion: row.schema_version,
          updatedAt: row.updated_at,
          vaultId: row.vault_id,
        }
      : null;
  }

  async save(record: VaultRecord) {
    const db = await this.db();
    const index = buildTanaIndex(record.document);
    await db.execute('BEGIN IMMEDIATE');
    try {
      await db.execute(
        `INSERT INTO vault_document (vault_id, schema_version, document_json, updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT(vault_id) DO UPDATE SET
           schema_version = excluded.schema_version,
           document_json = excluded.document_json,
           updated_at = excluded.updated_at`,
        [
          record.vaultId,
          record.schemaVersion,
          JSON.stringify(record.document),
          record.updatedAt,
        ]
      );
      await db.execute('DELETE FROM node_fts WHERE vault_id = $1', [
        record.vaultId,
      ]);
      for (const node of index.nodes.values()) {
        await db.execute(
          'INSERT INTO node_fts (vault_id, node_id, body) VALUES ($1, $2, $3)',
          [record.vaultId, node.nodeId, nodeText(node)]
        );
      }
      await db.execute('COMMIT');
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  }
}

export const createPersistenceAdapter = (): PersistenceAdapter =>
  '__TAURI_INTERNALS__' in window
    ? new SQLitePersistenceAdapter()
    : new BrowserPersistenceAdapter();

export const loadVault = async (
  adapter: PersistenceAdapter,
  vaultId: string
): Promise<VaultRecord> => {
  const record = await adapter.load(vaultId);
  if (record) {
    const migrated = {
      ...record,
      document: ensureNodeCatalog(record.document),
      schemaVersion: CURRENT_SCHEMA_VERSION,
    };
    if (
      migrated.document !== record.document ||
      record.schemaVersion !== CURRENT_SCHEMA_VERSION
    ) {
      await adapter.save(migrated);
    }
    return migrated;
  }

  return {
    document: createStarterDocument(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    vaultId,
  };
};
