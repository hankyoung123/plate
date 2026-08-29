import {
  buildTanaIndex,
  createStarterDocument,
  ensureNodeCatalog,
  nodeText,
  type NodeId,
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
  flush(): Promise<void>;
  load(vaultId: string): Promise<VaultRecord | null>;
  saveDocument(document: TanaDocument): Promise<void>;
}

const STORAGE_PREFIX = 'local-tana:vault:';
const CURRENT_SCHEMA_VERSION = 2;

const nodeSnapshot = (document: TanaDocument) =>
  new Map(
    [...buildTanaIndex(document).nodes].map(([nodeId, node]) => [
      nodeId,
      JSON.stringify(node),
    ])
  );

abstract class BasePersistenceAdapter implements PersistenceAdapter {
  abstract readonly kind: PersistenceAdapter['kind'];
  protected pendingWrite: Promise<void> = Promise.resolve();
  protected previousDocument: TanaDocument | undefined;
  protected vaultId = '';

  abstract load(vaultId: string): Promise<VaultRecord | null>;
  protected abstract write(
    record: VaultRecord,
    changed: ReadonlySet<NodeId>,
    removed: ReadonlySet<NodeId>
  ): Promise<void>;

  async saveDocument(document: TanaDocument) {
    const before = this.previousDocument
      ? nodeSnapshot(this.previousDocument)
      : new Map<NodeId, string>();
    const after = nodeSnapshot(document);
    const changed = new Set<NodeId>();
    const removed = new Set<NodeId>();
    for (const [nodeId, snapshot] of after) {
      if (before.get(nodeId) !== snapshot) changed.add(nodeId);
    }
    for (const nodeId of before.keys()) {
      if (!after.has(nodeId)) removed.add(nodeId);
    }
    const record: VaultRecord = {
      document,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      vaultId: this.vaultId,
    };
    const write = this.pendingWrite
      .catch(() => undefined)
      .then(() => this.write(record, changed, removed));
    this.pendingWrite = write;
    await write;
    this.previousDocument = document;
  }

  async flush() {
    await this.pendingWrite;
  }

  protected remember(vaultId: string, document: TanaDocument) {
    this.vaultId = vaultId;
    this.previousDocument = document;
  }
}

class BrowserPersistenceAdapter extends BasePersistenceAdapter {
  readonly kind = 'browser' as const;

  async load(vaultId: string) {
    this.vaultId = vaultId;
    const value = localStorage.getItem(`${STORAGE_PREFIX}${vaultId}`);
    if (!value) return null;
    const record = JSON.parse(value) as VaultRecord;
    this.remember(vaultId, record.document);
    return record;
  }

  protected async write(record: VaultRecord) {
    localStorage.setItem(
      `${STORAGE_PREFIX}${record.vaultId}`,
      JSON.stringify(record)
    );
  }
}

class SQLitePersistenceAdapter extends BasePersistenceAdapter {
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
    this.vaultId = vaultId;
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
    if (!row) return null;
    const document = JSON.parse(row.document_json) as TanaDocument;
    this.remember(vaultId, document);
    return {
      document,
      schemaVersion: row.schema_version,
      updatedAt: row.updated_at,
      vaultId: row.vault_id,
    };
  }

  protected async write(
    record: VaultRecord,
    changed: ReadonlySet<NodeId>,
    removed: ReadonlySet<NodeId>
  ) {
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
      for (const nodeId of [...changed, ...removed]) {
        await db.execute(
          'DELETE FROM node_fts WHERE vault_id = $1 AND node_id = $2',
          [record.vaultId, nodeId]
        );
      }
      for (const nodeId of changed) {
        const node = index.nodes.get(nodeId);
        if (!node) continue;
        await db.execute(
          'INSERT INTO node_fts (vault_id, node_id, body) VALUES ($1, $2, $3)',
          [record.vaultId, nodeId, nodeText(node)]
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
    const document = ensureNodeCatalog(record.document);
    if (
      document !== record.document ||
      record.schemaVersion !== CURRENT_SCHEMA_VERSION
    ) {
      await adapter.saveDocument(document);
      await adapter.flush();
      return {
        document,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        updatedAt: new Date().toISOString(),
        vaultId,
      };
    }
    return record;
  }

  return {
    document: createStarterDocument(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    vaultId,
  };
};
