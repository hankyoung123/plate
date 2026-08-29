import {
  type buildTanaIndex,
  nodeText,
  type NodeId,
  type PlacementElement,
} from '@platejs/tana';
import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useRef,
} from 'react';

import type { LocalTanaEditor } from '../editor';
import { Inspector } from '../inspector/Inspector';
import type { OutlineProjection } from '../outline/OutlineProjection';
import { OutlineSurface } from '../outline/OutlineSurface';
import type { PersistenceAdapter } from '../persistence';
import type { WorkspaceState } from './WorkspaceState';

export type WorkspaceContextValue = {
  editor: LocalTanaEditor;
  index: ReturnType<typeof buildTanaIndex>;
  projection: OutlineProjection;
  saveState: 'saved' | 'saving';
  inspect: (placement: PlacementElement) => void;
  openNode: (nodeId: NodeId) => void;
  setWorkspace: Dispatch<SetStateAction<WorkspaceState>>;
  workspace: WorkspaceState;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export const useWorkspace = () => {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('Local Tana workspace context is missing.');
  return value;
};

export const WorkspaceShell = ({
  adapter,
  context,
  onCommit,
}: {
  adapter: PersistenceAdapter;
  context: WorkspaceContextValue;
  onCommit: () => void;
}) => {
  const scrollContainerRef = useRef<HTMLElement>(null);
  return (
    <WorkspaceContext.Provider value={context}>
      <div className="app-shell">
        <TopBar adapter={adapter} />
        <Sidebar />
        <main className="workspace-canvas" ref={scrollContainerRef}>
          <Breadcrumbs />
          <TabStrip />
          <OutlineSurface
            onCommit={onCommit}
            scrollContainerRef={scrollContainerRef}
          />
        </main>
        <Inspector />
        <CommandPalette />
      </div>
    </WorkspaceContext.Provider>
  );
};

const TopBar = ({ adapter }: { adapter: PersistenceAdapter }) => {
  const { editor, setWorkspace, workspace } = useWorkspace();
  const { saveState } = useWorkspace();
  return (
    <header className="topbar">
      <button
        type="button"
        className="brand"
        onClick={() =>
          setWorkspace((state) => ({ ...state, zoomedPlacementId: undefined }))
        }
      >
        <span className="brand-mark">LT</span>
        <span>LOCAL TANA</span>
      </button>
      <button
        type="button"
        className="search-launcher"
        onClick={() =>
          setWorkspace((state) => ({ ...state, dialog: 'command' }))
        }
      >
        <span>Search nodes or run a command</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="topbar-status">
        <button
          type="button"
          className="history-button"
          aria-label="Undo"
          onClick={() => editor.update((tx) => tx.history.undo())}
        >
          ↶
        </button>
        <button
          type="button"
          className="history-button"
          aria-label="Redo"
          onClick={() => editor.update((tx) => tx.history.redo())}
        >
          ↷
        </button>
        <span className={`save-dot ${saveState}`} />
        {saveState === 'saved' ? 'Saved locally' : 'Saving'}
        <span className="storage-pill">
          {adapter.kind === 'sqlite' ? 'SQLite' : 'Browser'}
        </span>
      </div>
      <button
        type="button"
        className="icon-button"
        aria-label="Toggle inspector"
        onClick={() =>
          setWorkspace((state) => ({
            ...state,
            inspectorOpen: !workspace.inspectorOpen,
          }))
        }
      >
        ◫
      </button>
    </header>
  );
};

const Sidebar = () => {
  const { index, openNode, setWorkspace, workspace } = useWorkspace();
  if (!workspace.sidebarOpen) return null;
  const roots = index.children.get('root') ?? [];
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">VAULT</div>
      <nav>
        <button
          type="button"
          className={`nav-item ${workspace.zoomedPlacementId ? '' : 'active'}`}
          onClick={() =>
            setWorkspace((state) => ({
              ...state,
              zoomedPlacementId: undefined,
            }))
          }
        >
          <span>⌂</span>Everything
        </button>
        <button
          type="button"
          className="nav-item"
          onClick={() => {
            const node = [...index.nodes.values()].find(
              (item) => nodeText(item, index.nodes) === 'Today'
            );
            if (node) openNode(node.nodeId);
          }}
        >
          <span>◇</span>Today
        </button>
        <button
          type="button"
          className="nav-item"
          onClick={() =>
            setWorkspace((state) => ({
              ...state,
              dialog: 'references',
              search: '',
            }))
          }
        >
          <span>↗</span>References
        </button>
      </nav>
      <div className="sidebar-section-label">PINNED OUTLINES</div>
      <nav>
        {roots.slice(0, 6).map((id) => {
          const record = index.placements.get(id);
          const node = record && index.nodes.get(record.nodeId);
          return node ? (
            <button
              type="button"
              className="nav-item"
              key={id}
              onClick={() => openNode(node.nodeId)}
            >
              <span className="tiny-bullet" />
              {nodeText(node, index.nodes) || 'Untitled'}
            </button>
          ) : null;
        })}
      </nav>
      <div className="sidebar-note">
        <strong>{index.nodes.size}</strong> canonical nodes
        <br />
        <strong>{index.placements.size}</strong> placements
      </div>
    </aside>
  );
};

const Breadcrumbs = () => {
  const { index, openNode, setWorkspace, workspace } = useWorkspace();
  const placement =
    workspace.zoomedPlacementId &&
    index.placements.get(workspace.zoomedPlacementId);
  const lineage = placement
    ? [...placement.ancestors, placement.placementId]
    : [];
  return (
    <div className="breadcrumbs">
      <button
        type="button"
        onClick={() =>
          setWorkspace((state) => ({ ...state, zoomedPlacementId: undefined }))
        }
      >
        Workspace
      </button>
      {lineage.map((id) => {
        const item = index.placements.get(id);
        const node = item && index.nodes.get(item.nodeId);
        return node ? (
          <span key={id}>
            {' '}
            /{' '}
            <button type="button" onClick={() => openNode(node.nodeId)}>
              {nodeText(node, index.nodes) || 'Untitled'}
            </button>
          </span>
        ) : null;
      })}
    </div>
  );
};

const TabStrip = () => {
  const { index, openNode, setWorkspace, workspace } = useWorkspace();
  if (!workspace.tabs.length) return null;
  return (
    <div className="tab-strip" aria-label="Open outlines">
      {workspace.tabs.map((nodeId) => {
        const node = index.nodes.get(nodeId);
        return (
          <span
            className={workspace.activeNodeId === nodeId ? 'active' : ''}
            key={nodeId}
          >
            <button type="button" onClick={() => openNode(nodeId)}>
              {node
                ? nodeText(node, index.nodes) || 'Untitled'
                : 'Missing node'}
            </button>
            <button
              type="button"
              aria-label="Close outline tab"
              onClick={() =>
                setWorkspace((state) => ({
                  ...state,
                  tabs: state.tabs.filter((id) => id !== nodeId),
                }))
              }
            >
              x
            </button>
          </span>
        );
      })}
    </div>
  );
};

const CommandPalette = () => {
  const { index, openNode, setWorkspace, workspace } = useWorkspace();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setWorkspace((state) => ({
          ...state,
          dialog: state.dialog === 'command' ? null : 'command',
        }));
      }
      if (event.key === 'Escape') {
        setWorkspace((state) => ({ ...state, dialog: null }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setWorkspace]);
  useEffect(() => {
    if (workspace.dialog) input.current?.focus();
  }, [workspace.dialog]);
  if (
    !workspace.dialog ||
    (workspace.dialog !== 'command' && workspace.dialog !== 'references')
  ) {
    return null;
  }
  const referencesOnly = workspace.dialog === 'references';
  const results = [...index.nodes.values()]
    .filter(
      (node) =>
        (!referencesOnly ||
          (index.backlinks.get(node.nodeId)?.length ?? 0) > 0) &&
        nodeText(node, index.nodes)
          .toLocaleLowerCase()
          .includes(workspace.search.toLocaleLowerCase())
    )
    .slice(0, 10);
  return (
    <dialog
      aria-label={
        referencesOnly ? 'Referenced nodes' : 'Search nodes and commands'
      }
      className="dialog-backdrop"
      open
    >
      <div className="command-dialog">
        <input
          ref={input}
          value={workspace.search}
          onChange={(event) =>
            setWorkspace((state) => ({ ...state, search: event.target.value }))
          }
          placeholder={
            referencesOnly
              ? 'Find referenced nodes...'
              : 'Find anything in this vault...'
          }
        />
        {results.map((node) => (
          <button
            type="button"
            key={node.nodeId}
            onClick={() => {
              openNode(node.nodeId);
              setWorkspace((state) => ({ ...state, dialog: null }));
            }}
          >
            <span className="result-bullet" />
            <span>{nodeText(node, index.nodes) || 'Untitled'}</span>
          </button>
        ))}
      </div>
    </dialog>
  );
};
