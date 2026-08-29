import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildTanaIndex,
  createReference,
  createStarterDocument,
  isNodeElement,
  type NodeId,
  type TanaDocument,
} from '@platejs/tana';

import {
  BasePersistenceAdapter,
  BrowserPersistenceAdapter,
  loadVault,
  type VaultRecord,
} from './persistence';

const clone = (document: TanaDocument) =>
  structuredClone(document) as TanaDocument;

const rename = (document: TanaDocument, nodeId: NodeId, text: string) => {
  const node = buildTanaIndex(document).nodes.get(nodeId);
  assert.ok(node);
  node.children[0] = { type: 'paragraph', children: [{ text }] };
};

class RecordingAdapter extends BasePersistenceAdapter {
  readonly kind = 'browser' as const;
  readonly writes: Array<{
    changed: ReadonlySet<NodeId>;
    record: VaultRecord;
    removed: ReadonlySet<NodeId>;
  }> = [];
  private releaseWrite?: () => void;
  private writeBarrier?: Promise<void>;

  initialize(document: TanaDocument) {
    this.remember('test', document);
  }

  load(_vaultId: string): Promise<VaultRecord | null> {
    return Promise.resolve(null);
  }

  pauseNextWrite() {
    this.writeBarrier = new Promise((resolve) => {
      this.releaseWrite = resolve;
    });
  }

  release() {
    this.releaseWrite?.();
  }

  protected async write(
    record: VaultRecord,
    changed: ReadonlySet<NodeId>,
    removed: ReadonlySet<NodeId>
  ) {
    this.writes.push({ changed, record, removed });
    const barrier = this.writeBarrier;
    this.writeBarrier = undefined;
    if (barrier) await barrier;
  }
}

describe('Local Tana persistence queue', () => {
  it('diffs edit, revert, and another edit against the previous queued document', async () => {
    const original = createStarterDocument();
    const [firstId, secondId] = buildTanaIndex(original).nodes.keys();
    assert.ok(firstId && secondId);
    const first = clone(original);
    rename(first, firstId, 'first edit');
    const second = clone(original);
    rename(second, secondId, 'second edit');
    const adapter = new RecordingAdapter();
    adapter.initialize(original);

    const firstSave = adapter.saveDocument(first);
    const secondSave = adapter.saveDocument(second);
    await Promise.all([firstSave, secondSave]);

    assert.deepEqual([...adapter.writes[0]!.changed], [firstId]);
    assert.deepEqual(
      new Set(adapter.writes[1]!.changed),
      new Set([firstId, secondId])
    );
    assert.deepEqual(adapter.writes[1]!.record.document, second);
  });

  it('propagates canonical title changes into derived backlink FTS rows', async () => {
    const original = createStarterDocument();
    const [source, target] = buildTanaIndex(original).nodes.values();
    assert.ok(source && target);
    source.children[0]?.children.push(createReference(target.nodeId));
    const changed = clone(original);
    rename(changed, target.nodeId, 'renamed target');
    const adapter = new RecordingAdapter();
    adapter.initialize(original);

    await adapter.saveDocument(changed);

    assert.ok(adapter.writes[0]?.changed.has(target.nodeId));
    assert.ok(adapter.writes[0]?.changed.has(source.nodeId));
  });

  it('keeps flush pending until the active write commits', async () => {
    const original = createStarterDocument();
    const changed = clone(original);
    const node = buildTanaIndex(changed).nodes.values().next().value;
    assert.ok(node && isNodeElement(node));
    rename(changed, node.nodeId, 'pending');
    const adapter = new RecordingAdapter();
    adapter.initialize(original);
    adapter.pauseNextWrite();
    void adapter.saveDocument(changed);
    let flushed = false;
    const flush = adapter.flush().then(() => {
      flushed = true;
    });
    await Promise.resolve();
    assert.equal(flushed, false);
    adapter.release();
    await flush;
    assert.equal(flushed, true);
  });

  it('rejects old schema versions instead of upgrading them', async () => {
    const document = createStarterDocument();
    const adapter = {
      flush: async () => {},
      kind: 'browser' as const,
      load: async () => ({
        document,
        schemaVersion: 1,
        updatedAt: '',
        vaultId: 'test',
      }),
      saveDocument: async () => {
        throw new Error('must not migrate');
      },
    };
    await assert.rejects(
      () => loadVault(adapter, 'test'),
      /Unsupported vault schema/
    );
  });

  it('reloads the current canonical document from browser persistence', async () => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        key: (index: number) => [...values.keys()][index] ?? null,
        get length() {
          return values.size;
        },
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      } satisfies Storage,
    });
    const original = new BrowserPersistenceAdapter();
    const record = await loadVault(original, 'reload');
    const changed = clone(record.document);
    const nodeId = buildTanaIndex(changed).nodes.keys().next().value;
    assert.ok(nodeId);
    rename(changed, nodeId, 'persisted title');

    await original.saveDocument(changed);
    const reloaded = await loadVault(new BrowserPersistenceAdapter(), 'reload');

    assert.deepEqual(reloaded.document, changed);
  });
});
