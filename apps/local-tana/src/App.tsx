import {
  createEditorView,
  type Editor,
  PathApi,
  type Range,
  SelectionApi,
  type Path,
} from '@platejs/plite';
import { history } from '@platejs/plite-history';
import { outliner } from '@platejs/plite-outliner';
import {
  Editable,
  type RenderElementProps,
  Plite,
  useEditor,
  useElementPath,
  usePliteEditor,
} from '@platejs/plite-react';
import {
  applySupertag,
  type buildTanaIndex,
  commitEmoji,
  commitNewChild,
  commitReference,
  commitSharedPlacement,
  commitSupertag,
  filterComboboxItems,
  insertNodeAfter,
  mergePlacementBackward,
  movePlacements,
  nestPlacement,
  nodeText,
  normalizeFieldValue,
  parseCombobox,
  removePlacement,
  removePlacements,
  removeSupertag,
  resolveSupertagDefinition,
  setFieldValue,
  splitPlacementAtSelection,
  TanaSchema,
  type NodeElement,
  type NodeId,
  type FieldDefinition,
  type FieldValue,
  type ComboboxItem,
  type ComboboxState,
  type ParagraphElement,
  type PlacementAnchorElement,
  type PlacementElement,
  type ReferenceElement,
  type TanaDocument,
  type TanaElement,
  TanaIndexStore,
  unnestPlacement,
} from '@platejs/tana';
import {
  createContext,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createPersistenceAdapter,
  loadVault,
  type PersistenceAdapter,
  type VaultRecord,
} from './persistence';
import { initialWorkspace, type WorkspaceState } from './workspace';

const VAULT_ID = 'default';
const DRAG_TYPE = 'application/x-local-tana-placement';

const EMOJI_ITEMS: readonly ComboboxItem[] = [
  { id: '😀', label: '😀', description: 'Smile', keywords: ['happy', 'face'] },
  {
    id: '✅',
    label: '✅',
    description: 'Done',
    keywords: ['check', 'complete'],
  },
  {
    id: '🔥',
    label: '🔥',
    description: 'Important',
    keywords: ['fire', 'hot'],
  },
  { id: '💡', label: '💡', description: 'Idea', keywords: ['light', 'bulb'] },
  { id: '📌', label: '📌', description: 'Pinned', keywords: ['pin'] },
  { id: '🚀', label: '🚀', description: 'Launch', keywords: ['rocket'] },
];

type AppContextValue = {
  index: ReturnType<typeof buildTanaIndex>;
  inspect: (placement: PlacementElement) => void;
  openNode: (nodeId: NodeId) => void;
  setWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  workspace: WorkspaceState;
};

const AppContext = createContext<AppContextValue | null>(null);
const useApp = () => {
  const value = useContext(AppContext);
  if (!value) throw new Error('Local Tana app context is missing.');
  return value;
};

export const App = () => {
  const adapter = useMemo(() => createPersistenceAdapter(), []);
  const [record, setRecord] = useState<VaultRecord | null>(null);
  const [loadError, setError] = useState<string>();

  useEffect(() => {
    loadVault(adapter, VAULT_ID)
      .then(setRecord)
      .catch((error: unknown) =>
        setError(error instanceof Error ? error.message : String(error))
      );
  }, [adapter]);

  if (loadError) return <FatalError message={loadError} />;
  if (!record) return <LoadingVault kind={adapter.kind} />;

  return <Vault key={record.updatedAt} adapter={adapter} initial={record} />;
};

const LoadingVault = ({ kind }: { kind: PersistenceAdapter['kind'] }) => (
  <main className="loading-screen">
    <span className="loading-mark">LT</span>
    <p>Opening {kind === 'sqlite' ? 'local SQLite vault' : 'browser vault'}…</p>
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
  const extensions = useMemo(
    () => [history(), outliner(), TanaSchema] as const,
    []
  );
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
  const saveTimer = useRef<number | undefined>(undefined);
  const pendingSave = useRef<VaultRecord | undefined>(undefined);

  const persist = useCallback(
    (value: TanaDocument) => {
      window.clearTimeout(saveTimer.current);
      setSaveState('saving');
      pendingSave.current = {
        document: value,
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        vaultId: VAULT_ID,
      };
      saveTimer.current = window.setTimeout(() => {
        const record = pendingSave.current;
        if (!record) return;
        adapter
          .save(record)
          .then(() => {
            if (pendingSave.current === record) {
              pendingSave.current = undefined;
              setSaveState('saved');
            }
          })
          .catch(() => setSaveState('saving'));
      }, 180);
    },
    [adapter]
  );

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      if (pendingSave.current) void adapter.save(pendingSave.current);
    },
    [adapter]
  );

  const onCommit = useCallback(() => {
    const value = editor.read.value() as TanaDocument;
    setIndex(indexStore.update(value));
    persist(value);
  }, [editor, indexStore, persist]);

  const inspect = useCallback((placement: PlacementElement) => {
    setWorkspace((current) => ({
      ...current,
      activeNodeId: placement.nodeId,
      activePlacementId: placement.placementId,
      inspectorOpen: true,
    }));
  }, []);

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

  const context = useMemo(
    () => ({ index, inspect, openNode, setWorkspace, workspace }),
    [index, inspect, openNode, workspace]
  );

  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <TopBar
          adapter={adapter}
          editor={editor as Editor}
          saveState={saveState}
        />
        <Sidebar />
        <main className="workspace-canvas">
          <Breadcrumbs />
          <TabStrip />
          <div className="outline-paper">
            <Plite editor={editor} onCommit={onCommit}>
              <Editable
                aria-label="Local Tana outline"
                className="outline-editor"
                domStrategy="full"
                renderElement={renderElement}
              />
            </Plite>
          </div>
        </main>
        <Inspector editor={editor as Editor} />
        <CommandPalette />
      </div>
    </AppContext.Provider>
  );
};

const TopBar = ({
  adapter,
  editor,
  saveState,
}: {
  adapter: PersistenceAdapter;
  editor: Editor;
  saveState: 'saved' | 'saving';
}) => {
  const { setWorkspace, workspace } = useApp();
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
          onClick={() =>
            editor.update((tx) =>
              (tx as typeof tx & { history: { undo(): void } }).history.undo()
            )
          }
        >
          ↶
        </button>
        <button
          type="button"
          className="history-button"
          aria-label="Redo"
          onClick={() =>
            editor.update((tx) =>
              (tx as typeof tx & { history: { redo(): void } }).history.redo()
            )
          }
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
  const { index, openNode, setWorkspace, workspace } = useApp();
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
            const today = [...index.nodes.values()].find(
              (node) => nodeText(node) === 'Today'
            );
            if (today) openNode(today.nodeId);
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
        {roots.slice(0, 6).map((placementId) => {
          const record = index.placements.get(placementId);
          const node = record && index.nodes.get(record.nodeId);
          return node ? (
            <button
              type="button"
              className="nav-item"
              key={placementId}
              onClick={() => openNode(node.nodeId)}
            >
              <span className="tiny-bullet" />
              {nodeText(node) || 'Untitled'}
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
  const { index, openNode, setWorkspace, workspace } = useApp();
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
            /{' '}
            <button type="button" onClick={() => openNode(node.nodeId)}>
              {nodeText(node) || 'Untitled'}
            </button>
          </span>
        ) : null;
      })}
    </div>
  );
};

const TabStrip = () => {
  const { index, openNode, setWorkspace, workspace } = useApp();
  if (workspace.tabs.length === 0) return null;
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
              {node ? nodeText(node) || 'Untitled' : 'Missing node'}
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
              ×
            </button>
          </span>
        );
      })}
    </div>
  );
};

const renderElement = (props: RenderElementProps<TanaElement>) => {
  switch (props.element.type) {
    case 'placement': {
      return <Placement {...(props as RenderElementProps<PlacementElement>)} />;
    }
    case 'node': {
      return <NodeBody {...(props as RenderElementProps<NodeElement>)} />;
    }
    case 'paragraph': {
      return <Paragraph {...(props as RenderElementProps<ParagraphElement>)} />;
    }
    case 'placement-anchor': {
      return (
        <PlacementAnchor
          {...(props as RenderElementProps<PlacementAnchorElement>)}
        />
      );
    }
    case 'reference': {
      return <Reference {...(props as RenderElementProps<ReferenceElement>)} />;
    }
    default: {
      return <div {...props.attributes}>{props.children}</div>;
    }
  }
};

const Placement = ({
  attributes,
  children,
  element,
  slots,
}: RenderElementProps<PlacementElement>) => {
  const editor = useEditor() as unknown as Editor;
  const path = useElementPath();
  const { index, inspect, openNode, setWorkspace, workspace } = useApp();
  const [menu, setMenu] = useState<{ x: number; y: number }>();
  const [combo, setCombo] = useState<ReturnType<typeof parseCombobox>>(null);
  const comboSelection = useRef<Range | null>(null);
  const [dropIntent, setDropIntent] = useState<'after' | 'before' | 'child'>();
  const node = index.nodes.get(element.nodeId);
  const zoomed = workspace.zoomedPlacementId;
  const record = index.placements.get(element.placementId);
  const zoomRecord = zoomed && index.placements.get(zoomed);
  const isZoomAncestor = Boolean(
    zoomRecord?.ancestors.includes(element.placementId)
  );
  const visible =
    !zoomed ||
    zoomed === element.placementId ||
    record?.ancestors.includes(zoomed) ||
    isZoomAncestor;
  if (!visible) {
    return (
      <div {...attributes} className="placement-hidden">
        {children}
      </div>
    );
  }
  const items = combo ? comboboxItems(index, combo) : [];
  const collapsed = workspace.collapsedPlacementIds.includes(
    element.placementId
  );

  const chooseCombo = (item: ComboboxItem | undefined) => {
    if (!combo || !item || !path) return;
    const triggerLength = combo.query.length + 1;
    if (combo.trigger === '@') {
      commitReference(
        editor,
        element.nodeId,
        item.id as NodeId,
        item.label,
        triggerLength,
        comboSelection.current
      );
    } else if (combo.trigger === '#') {
      const definition = index.nodes.get(item.id as NodeId)?.metadata
        .supertagDefinition;
      commitSupertag(
        editor,
        element.nodeId,
        item.id as NodeId,
        definition,
        triggerLength,
        comboSelection.current
      );
    } else if (combo.trigger === ':') {
      commitEmoji(
        editor,
        element.nodeId,
        item.id,
        triggerLength,
        comboSelection.current
      );
    } else if (item.id === 'new-child') {
      commitNewChild(
        editor,
        path,
        element.nodeId,
        triggerLength,
        comboSelection.current
      );
    } else if (item.id === 'duplicate') {
      commitSharedPlacement(
        editor,
        path,
        element.nodeId,
        triggerLength,
        comboSelection.current
      );
    }
    setCombo(null);
  };

  const toggleCollapsed = () => {
    setWorkspace((current) => {
      const isCollapsed = current.collapsedPlacementIds.includes(
        element.placementId
      );
      return {
        ...current,
        collapsedPlacementIds: isCollapsed
          ? current.collapsedPlacementIds.filter(
              (id) => id !== element.placementId
            )
          : [...current.collapsedPlacementIds, element.placementId],
      };
    });
  };
  const toggleCollapse = (event: MouseEvent) => {
    event.preventDefault();
    toggleCollapsed();
  };
  const selectPlacement = (event: PointerEvent) => {
    event.preventDefault();
    if (!path) return;
    const current = editor.read.runtime.snapshot().selection;
    if (event.shiftKey && SelectionApi.isNode(current)) {
      const ordered = [...index.placements.values()]
        .sort((left, right) => PathApi.compare(left.path, right.path))
        .map((item) => item.path);
      const anchorIndex = ordered.findIndex((candidate) =>
        PathApi.equals(candidate, current.anchorPath)
      );
      const focusIndex = ordered.findIndex((candidate) =>
        PathApi.equals(candidate, path)
      );
      if (anchorIndex !== -1 && focusIndex !== -1) {
        const [start, end] = [anchorIndex, focusIndex].sort((a, b) => a - b);
        const paths = ordered.slice(start, end + 1) as [Path, ...Path[]];
        editor.update.selection.set(SelectionApi.nodes(paths));
      }
    } else if (event.metaKey && SelectionApi.isNode(current)) {
      const selected = current.paths.some((candidate) =>
        PathApi.equals(candidate, path)
      );
      const paths = selected
        ? current.paths.filter((candidate) => !PathApi.equals(candidate, path))
        : [...current.paths, path];
      editor.update.selection.set(
        paths.length > 0 ? SelectionApi.nodes(paths as [Path, ...Path[]]) : null
      );
    } else {
      editor.update.selection.set(SelectionApi.nodes([path]));
    }
    inspect(element);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!path || event.nativeEvent.isComposing) return;
    if (combo && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      setCombo({
        ...combo,
        activeIndex:
          items.length === 0
            ? 0
            : (combo.activeIndex + delta + items.length) % items.length,
      });
      return;
    }
    if (combo && event.key === 'Escape') {
      event.preventDefault();
      setCombo(null);
      return;
    }
    if (combo && event.key === 'Enter') {
      event.preventDefault();
      chooseCombo(items[combo.activeIndex]);
      return;
    }
    const current = editor.read.runtime.snapshot().selection;
    if (event.key === 'Escape') {
      event.preventDefault();
      editor.update.selection.set(
        SelectionApi.isNode(current) ? null : SelectionApi.nodes([path])
      );
      return;
    }
    if (
      SelectionApi.isNode(current) &&
      (event.key === 'Delete' || event.key === 'Backspace')
    ) {
      event.preventDefault();
      removePlacements(editor, current.paths);
      return;
    }
    const referenceTarget =
      event.target instanceof HTMLElement &&
      event.target.closest('.reference-chip');
    if (referenceTarget && event.key === 'Enter') return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (collapsed) {
        toggleCollapsed();
        return;
      }
      const view = createEditorView(editor, { root: `${element.nodeId}:root` });
      const selection = view.read.selection();
      splitPlacementAtSelection(editor, path, element.nodeId, selection);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      if (event.shiftKey) {
        unnestPlacement(editor, path);
      } else {
        nestPlacement(editor, path);
      }
    } else if (event.key === 'Backspace') {
      const view = createEditorView(editor, { root: `${element.nodeId}:root` });
      const selection = view.read.selection();
      const atStart =
        selection !== null &&
        selection.focus.offset === 0 &&
        selection.focus.path[1] === 0 &&
        selection.focus.path[2] === 0;
      if (atStart && node) {
        let handled = false;
        if (nodeText(node) === '') {
          removePlacement(editor, path);
          handled = true;
        } else {
          handled = mergePlacementBackward(editor, path, element);
        }
        if (handled) event.preventDefault();
      }
    }
  };
  const keyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    const view = createEditorView(editor, { root: `${element.nodeId}:root` });
    comboSelection.current = view.read.selection();
    setCombo(parseCombobox(view.read.text.string([])));
  };
  const dragStart = (event: DragEvent) => {
    if (!path) return;
    const { selection } = editor.read.runtime.snapshot();
    const payload =
      SelectionApi.isNode(selection) &&
      selection.paths.some((candidate) => PathApi.equals(candidate, path))
        ? selection
        : SelectionApi.nodes([path]);
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = 'move';
  };
  const dragOver = (event: DragEvent) => {
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const y = (event.clientY - box.top) / box.height;
    setDropIntent(
      event.clientX - box.left > 48 ? 'child' : y < 0.5 ? 'before' : 'after'
    );
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    if (!path || !dropIntent) return;
    try {
      const selection = JSON.parse(event.dataTransfer.getData(DRAG_TYPE));
      movePlacements(editor, selection, path, dropIntent);
    } finally {
      setDropIntent(undefined);
    }
  };

  return (
    <div
      {...attributes}
      className={`placement ${dropIntent ? `drop-${dropIntent}` : ''} ${isZoomAncestor ? 'zoom-ancestor' : ''} ${zoomed === element.placementId ? 'zoom-target' : ''}`}
      data-placement-id={element.placementId}
    >
      <div
        className="placement-line"
        onContextMenu={(event) => {
          event.preventDefault();
          setMenu({ x: event.clientX, y: event.clientY });
        }}
        onDragOver={dragOver}
        onDragLeave={() => setDropIntent(undefined)}
        onDrop={drop}
      >
        <button
          type="button"
          className={`disclosure ${element.children.some((child) => 'type' in child && child.type === 'placement') ? '' : 'empty'} ${collapsed ? 'is-collapsed' : ''}`}
          contentEditable={false}
          onClick={toggleCollapse}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          ⌄
        </button>
        <button
          type="button"
          className="bullet"
          contentEditable={false}
          draggable
          onDragStart={dragStart}
          onDoubleClick={() => openNode(element.nodeId)}
          onPointerDown={selectPlacement}
          aria-label="Select and drag node"
        >
          <span />
        </button>
        <div
          className="node-content"
          onKeyDownCapture={keyDown}
          onKeyUpCapture={keyUp}
        >
          {slots.contentRoot('body', {
            ariaLabel: `Node ${element.nodeId}`,
            className: 'node-root-editor',
            domStrategy: 'full',
            placeholder: 'Write something…',
          })}
          {combo && path && (
            <InlineCombobox items={items} state={combo} choose={chooseCombo} />
          )}
        </div>
        <button
          type="button"
          className="row-action"
          contentEditable={false}
          onClick={() => path && insertNodeAfter(editor, path)}
          aria-label="Add node after"
        >
          ＋
        </button>
      </div>
      <div className={`placement-children ${collapsed ? 'collapsed' : ''}`}>
        {children}
      </div>
      {menu && (
        <ContextMenu
          close={() => setMenu(undefined)}
          editor={editor}
          path={path}
          position={menu}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
        />
      )}
      {node && (index.placementsByNode.get(node.nodeId)?.length ?? 0) > 1 && (
        <span className="shared-badge" contentEditable={false}>
          ↻ shared
        </span>
      )}
    </div>
  );
};

const NodeBody = ({
  attributes,
  children,
}: RenderElementProps<NodeElement>) => (
  <div {...attributes} className="node-body">
    {children}
  </div>
);
const Paragraph = ({
  attributes,
  children,
}: RenderElementProps<ParagraphElement>) => (
  <div {...attributes} className="node-paragraph">
    {children}
  </div>
);
const PlacementAnchor = ({
  attributes,
  children,
}: RenderElementProps<PlacementAnchorElement>) => (
  <span {...attributes} className="placement-anchor">
    {children}
  </span>
);
const Reference = ({
  attributes,
  children,
  element,
}: RenderElementProps<ReferenceElement>) => {
  const { index, openNode } = useApp();
  const target = index.nodes.get(element.targetNodeId);
  return (
    <span
      {...attributes}
      className="reference-chip"
      data-preview={target ? nodeText(target) : 'Missing node'}
      onClick={() => openNode(element.targetNodeId)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openNode(element.targetNodeId);
        }
      }}
      role="button"
      tabIndex={0}
    >
      @{element.label}
      {children}
    </span>
  );
};

const definitionsForNode = (
  index: ReturnType<typeof buildTanaIndex>,
  nodeId: NodeId
): readonly FieldDefinition[] => {
  const node = index.nodes.get(nodeId);
  const definitions = new Map(
    [...index.nodes.values()].flatMap((candidate) =>
      candidate.metadata.supertagDefinition
        ? [[candidate.nodeId, candidate.metadata.supertagDefinition] as const]
        : []
    )
  );
  const fields = new Map<string, FieldDefinition>();
  for (const tagId of node?.metadata.supertags ?? []) {
    for (const field of resolveSupertagDefinition(tagId, definitions)?.fields ??
      []) {
      fields.set(field.id, field);
    }
  }
  for (const field of node?.metadata.fieldDefinitions ?? []) {
    fields.set(field.id, field);
  }
  return [...fields.values()];
};

const comboboxItems = (
  index: ReturnType<typeof buildTanaIndex>,
  state: ComboboxState
): readonly ComboboxItem[] => {
  const items =
    state.trigger === '@'
      ? [...index.nodes.values()].map((node) => ({
          id: node.nodeId,
          label: nodeText(node) || 'Untitled',
        }))
      : state.trigger === '#'
        ? [...index.nodes.values()].flatMap((node) =>
            node.metadata.supertagDefinition
              ? [
                  {
                    id: node.nodeId,
                    label: node.metadata.supertagDefinition.name,
                    description: 'Apply a supertag',
                  },
                ]
              : []
          )
        : state.trigger === ':'
          ? EMOJI_ITEMS
          : [
              { id: 'new-child', label: 'New child node' },
              { id: 'duplicate', label: 'Create shared placement' },
            ];
  return filterComboboxItems(items, state.query).slice(0, 7);
};

const InlineCombobox = ({
  choose,
  items,
  state,
}: {
  choose: (item: ComboboxItem) => void;
  items: readonly ComboboxItem[];
  state: NonNullable<ReturnType<typeof parseCombobox>>;
}) => (
  <div className="inline-combobox" contentEditable={false}>
    <div className="combo-title">
      {state.trigger === '@'
        ? 'Reference a node'
        : state.trigger === '#'
          ? 'Apply supertag'
          : state.trigger === ':'
            ? 'Emoji'
            : 'Commands'}
    </div>
    {items.map((item, index) => (
      <button
        type="button"
        className={index === state.activeIndex ? 'active' : ''}
        key={item.id}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => choose(item)}
      >
        <span>{item.label}</span>
        <small>{item.description}</small>
      </button>
    ))}
  </div>
);

const ContextMenu = ({
  collapsed,
  close,
  editor,
  path,
  position,
  toggleCollapsed,
}: {
  collapsed: boolean;
  close: () => void;
  editor: Editor;
  path: Path | null;
  position: { x: number; y: number };
  toggleCollapsed: () => void;
}) => (
  <div
    className="context-menu"
    contentEditable={false}
    style={{ left: position.x, top: position.y }}
  >
    <button
      type="button"
      onClick={() => {
        if (path) insertNodeAfter(editor, path);
        close();
      }}
    >
      Add node below <kbd>↵</kbd>
    </button>
    <button
      type="button"
      onClick={() => {
        if (path) nestPlacement(editor, path);
        close();
      }}
    >
      Indent <kbd>Tab</kbd>
    </button>
    <button
      type="button"
      onClick={() => {
        if (path) unnestPlacement(editor, path);
        close();
      }}
    >
      Outdent <kbd>⇧Tab</kbd>
    </button>
    <hr />
    <button
      type="button"
      onClick={() => {
        toggleCollapsed();
        close();
      }}
    >
      {collapsed ? 'Expand children' : 'Collapse children'}
    </button>
    <button
      type="button"
      className="danger"
      onClick={() => {
        if (path) removePlacement(editor, path);
        close();
      }}
    >
      Remove placement
    </button>
  </div>
);

const Inspector = ({ editor }: { editor: Editor }) => {
  const { index, openNode, setWorkspace, workspace } = useApp();
  if (!workspace.inspectorOpen) return null;
  const node =
    workspace.activeNodeId && index.nodes.get(workspace.activeNodeId);
  const fields = node ? definitionsForNode(index, node.nodeId) : [];
  const projectId = 'node:tag-project' as NodeId;
  const projectDefinition =
    index.nodes.get(projectId)?.metadata.supertagDefinition;
  return (
    <aside className="inspector">
      <div className="inspector-head">
        <span>NODE DETAILS</span>
        <button
          type="button"
          onClick={() =>
            setWorkspace((state) => ({ ...state, inspectorOpen: false }))
          }
        >
          ×
        </button>
      </div>
      {node ? (
        <>
          <h2>{nodeText(node) || 'Untitled'}</h2>
          <div className="id-label">{node.nodeId}</div>
          <section>
            <h3 className="section-label">SUPERTAGS</h3>
            <div className="tag-row">
              {(node.metadata.supertags ?? []).map((tag) => (
                <button
                  type="button"
                  className="applied-tag"
                  key={tag}
                  onClick={() => removeSupertag(editor, node.nodeId, tag)}
                >
                  #
                  {index.nodes.get(tag)?.metadata.supertagDefinition?.name ??
                    tag.split(':').at(-1)}{' '}
                  ×
                </button>
              ))}
              {!(node.metadata.supertags ?? []).includes(projectId) && (
                <button
                  type="button"
                  onClick={() =>
                    applySupertag(
                      editor,
                      node.nodeId,
                      projectId,
                      projectDefinition
                    )
                  }
                >
                  ＋ Project
                </button>
              )}
            </div>
          </section>
          <section>
            <h3 className="section-label">FIELDS</h3>
            {fields.map((definition) => (
              <FieldEditor
                definition={definition}
                index={index}
                key={definition.id}
                value={node.metadata.fields?.[definition.id] ?? null}
                onChange={(value) =>
                  setFieldValue(editor, node.nodeId, definition.id, value)
                }
              />
            ))}
            {fields.length === 0 && (
              <p className="muted">Apply a supertag to add typed fields.</p>
            )}
          </section>
          <section>
            <h3 className="section-label">BACKLINKS</h3>
            {(index.backlinks.get(node.nodeId) ?? []).map((id) => {
              const backlink = index.nodes.get(id);
              return backlink ? (
                <button
                  type="button"
                  className="backlink"
                  key={id}
                  onClick={() => openNode(id)}
                >
                  {nodeText(backlink)}
                </button>
              ) : null;
            })}
            {!index.backlinks.get(node.nodeId)?.length && (
              <p className="muted">No references yet. Type @ in any node.</p>
            )}
          </section>
          <section>
            <h3 className="section-label">PLACEMENTS</h3>
            <p>
              {index.placementsByNode.get(node.nodeId)?.length ?? 0} location(s)
              in this vault
            </p>
          </section>
        </>
      ) : (
        <div className="empty-inspector">
          <span>◎</span>
          <p>
            Select a bullet to inspect its canonical node, fields, tags, and
            backlinks.
          </p>
        </div>
      )}
    </aside>
  );
};

const FieldEditor = ({
  definition,
  index,
  onChange,
  value,
}: {
  definition: FieldDefinition;
  index: ReturnType<typeof buildTanaIndex>;
  onChange: (value: FieldValue) => void;
  value: FieldValue;
}) => {
  if (definition.type === 'boolean') {
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <input
          checked={Boolean(value)}
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
    );
  }
  if (definition.type === 'select') {
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <select
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">—</option>
          {definition.options?.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }
  if (definition.type === 'node-reference') {
    const selected = Array.isArray(value) ? (value[0] ?? '') : '';
    return (
      <label className="field-input">
        <span>{definition.label}</span>
        <select
          value={selected}
          onChange={(event) =>
            onChange(event.target.value ? [event.target.value] : [])
          }
        >
          <option value="">—</option>
          {[...index.nodes.values()].map((node) => (
            <option key={node.nodeId} value={node.nodeId}>
              {nodeText(node) || 'Untitled'}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const inputType =
    definition.type === 'date'
      ? 'date'
      : definition.type === 'number'
        ? 'number'
        : 'text';
  return (
    <label className="field-input">
      <span>{definition.label}</span>
      <input
        type={inputType}
        value={String(value ?? '')}
        onChange={(event) =>
          onChange(normalizeFieldValue(definition, event.target.value))
        }
      />
    </label>
  );
};

const CommandPalette = () => {
  const { index, openNode, setWorkspace, workspace } = useApp();
  const input = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
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
    if (workspace.dialog === 'command' || workspace.dialog === 'references') {
      input.current?.focus();
    }
  }, [workspace.dialog]);
  if (workspace.dialog !== 'command' && workspace.dialog !== 'references') {
    return null;
  }
  const referencesOnly = workspace.dialog === 'references';
  const results = [...index.nodes.values()]
    .filter(
      (node) =>
        (!referencesOnly ||
          (index.backlinks.get(node.nodeId)?.length ?? 0) > 0) &&
        nodeText(node)
          .toLocaleLowerCase()
          .includes(workspace.search.toLocaleLowerCase())
    )
    .slice(0, 10);
  const chooseResult = (node: NodeElement | undefined) => {
    if (!node) return;
    openNode(node.nodeId);
    setWorkspace((state) => ({ ...state, dialog: null }));
  };
  return (
    <dialog
      aria-label={
        referencesOnly ? 'Referenced nodes' : 'Search nodes and commands'
      }
      className="dialog-backdrop"
      onClose={() => setWorkspace((state) => ({ ...state, dialog: null }))}
      open
    >
      <div className="command-dialog">
        <input
          ref={input}
          value={workspace.search}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const delta = event.key === 'ArrowDown' ? 1 : -1;
              setActiveIndex((current) =>
                results.length === 0
                  ? 0
                  : (current + delta + results.length) % results.length
              );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              chooseResult(results[activeIndex]);
            }
          }}
          onChange={(event) => {
            setActiveIndex(0);
            setWorkspace((state) => ({
              ...state,
              search: event.target.value,
            }));
          }}
          placeholder={
            referencesOnly
              ? 'Find referenced nodes…'
              : 'Find anything in this vault…'
          }
        />
        <div className="command-results">
          {results.map((node, resultIndex) => (
            <button
              type="button"
              className={resultIndex === activeIndex ? 'active' : ''}
              key={node.nodeId}
              onClick={() => chooseResult(node)}
            >
              <span className="result-bullet" />
              <span>{nodeText(node) || 'Untitled'}</span>
              <small>
                {index.placementsByNode.get(node.nodeId)?.length ?? 0}{' '}
                placements
              </small>
            </button>
          ))}
        </div>
        <footer>
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>esc Close</span>
        </footer>
      </div>
    </dialog>
  );
};
