import { usePliteEditor } from '@platejs/plite-react';
import {
  TanaIndexStore,
  type NodeId,
  type PlacementElement,
  type TanaDocument,
} from '@platejs/tana';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createLocalTanaExtensions } from './editor';
import { createOutlineProjection } from './outline/OutlineProjection';
import {
  createPersistenceAdapter,
  loadVault,
  type PersistenceAdapter,
  type VaultRecord,
} from './persistence';
import {
  WorkspaceShell,
  type WorkspaceContextValue,
} from './workspace/WorkspaceShell';
import {
  initialWorkspace,
  type WorkspaceState,
} from './workspace/WorkspaceState';

const VAULT_ID = 'default';

export const App = () => {
  const adapter = useMemo(() => createPersistenceAdapter(), []);
  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => {
    loadVault(adapter, VAULT_ID)
      .then(setRecord)
      .catch((error: unknown) => {
        setError(error instanceof Error ? error.message : String(error));
      });
  }, [adapter]);
  if (error) return <FatalError message={error} />;
  if (!record) return <LoadingVault kind={adapter.kind} />;
  return <Vault adapter={adapter} initial={record} />;
};

const LoadingVault = ({ kind }: { kind: PersistenceAdapter['kind'] }) => (
  <main className="loading-screen">
    <span className="loading-mark">LT</span>
    <p>
      Opening {kind === 'sqlite' ? 'local SQLite vault' : 'browser vault'}...
    </p>
  </main>
);

const FatalError = ({ message }: { message: string }) => (
  <main className="loading-screen error-screen">
    <span className="loading-mark">!</span>
    <h1>Could not open this vault</h1>
    <pre>{message}</pre>
  </main>
);

const Vault = ({
  adapter,
  initial,
}: {
  adapter: PersistenceAdapter;
  initial: VaultRecord;
}) => {
  const extensions = useMemo(() => createLocalTanaExtensions(), []);
  const editor = usePliteEditor({
    clipboardFormatKey: 'application/x-local-tana-fragment',
    extensions,
    initialValue: initial.document,
  });
  const indexStore = useMemo(
    () => new TanaIndexStore(initial.document),
    [initial.document]
  );
  const [index, setIndex] = useState(indexStore.current);
  const [workspace, setWorkspace] = useState<WorkspaceState>(initialWorkspace);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<TanaDocument | undefined>(undefined);
  const persist = useCallback(
    (document: TanaDocument) => {
      window.clearTimeout(timer.current);
      pending.current = document;
      setSaveState('saving');
      timer.current = window.setTimeout(() => {
        const next = pending.current;
        if (!next) return;
        pending.current = undefined;
        adapter
          .saveDocument(next)
          .then(() => setSaveState('saved'))
          .catch(() => setSaveState('saving'));
      }, 180);
    },
    [adapter, pending, timer]
  );
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    pending.current = undefined;
    if (next) await adapter.saveDocument(next);
    await adapter.flush();
  }, [adapter, pending, timer]);
  useEffect(() => {
    let dispose: (() => void) | undefined;
    if ('__TAURI_INTERNALS__' in window) {
      void import('@tauri-apps/api/window').then(
        async ({ getCurrentWindow }) => {
          const unlisten = await getCurrentWindow().onCloseRequested(
            async (event) => {
              event.preventDefault();
              await flush();
              await getCurrentWindow().destroy();
            }
          );
          dispose = unlisten;
        }
      );
    }
    const onPageHide = () => {
      void flush();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      dispose?.();
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);
  const onCommit = useCallback(() => {
    const document = editor.read.value() as TanaDocument;
    setIndex(indexStore.update(document));
    persist(document);
  }, [editor, indexStore, persist]);
  const inspect = useCallback(
    (placement: PlacementElement) =>
      setWorkspace((current) => ({
        ...current,
        activeNodeId: placement.nodeId,
        activePlacementId: placement.placementId,
        inspectorOpen: true,
      })),
    []
  );
  const openNode = useCallback(
    (nodeId: NodeId) => {
      const placementId = index.placementsByNode.get(nodeId)?.[0];
      setWorkspace((current) => ({
        ...current,
        activeNodeId: nodeId,
        activePlacementId: placementId,
        tabs: [...new Set([...current.tabs, nodeId])],
        zoomedPlacementId: placementId,
      }));
    },
    [index]
  );
  const projection = useMemo(
    () => createOutlineProjection(index, workspace),
    [index, workspace]
  );
  const context: WorkspaceContextValue = useMemo(
    () => ({
      editor: editor as unknown as WorkspaceContextValue['editor'],
      index,
      inspect,
      openNode,
      projection,
      saveState,
      setWorkspace,
      workspace,
    }),
    [editor, index, inspect, openNode, projection, saveState, workspace]
  );
  return (
    <WorkspaceShell adapter={adapter} context={context} onCommit={onCommit} />
  );
};
