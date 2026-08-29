import {
  PliteCombobox,
  usePliteCombobox,
  type PliteComboboxItem,
  type PliteComboboxState,
} from '@platejs/combobox';
import {
  createEditorView,
  PathApi,
  SelectionApi,
  type Editor,
} from '@platejs/plite';
import {
  selectOutlineRange,
  toggleOutlineSelection,
  useOutlinerDrag,
} from '@platejs/plite-outliner';
import {
  type RenderElementProps,
  useEditor,
  useElementPath,
} from '@platejs/plite-react';
import {
  filterComboboxItems,
  nodeText,
  type NodeId,
  type PlacementElement,
  type ReferenceElement,
  type TanaElement,
} from '@platejs/tana';
import type { KeyboardEvent, PointerEvent } from 'react';

import { useWorkspace } from '../workspace/WorkspaceShell';

const EMOJI_ITEMS: readonly PliteComboboxItem[] = [
  { id: '😀', label: '😀', description: 'Smile' },
  { id: '✅', label: '✅', description: 'Done' },
  { id: '🔥', label: '🔥', description: 'Important' },
  { id: '💡', label: '💡', description: 'Idea' },
  { id: '📌', label: '📌', description: 'Pinned' },
];

export const renderElement = (props: RenderElementProps<TanaElement>) => {
  switch (props.element.type) {
    case 'placement': {
      return (
        <PlacementView {...(props as RenderElementProps<PlacementElement>)} />
      );
    }
    case 'node': {
      return (
        <div {...props.attributes} className="node-body">
          {props.children}
        </div>
      );
    }
    case 'paragraph': {
      return (
        <div {...props.attributes} className="node-paragraph">
          {props.children}
        </div>
      );
    }
    case 'placement-anchor': {
      return (
        <span {...props.attributes} className="placement-anchor">
          {props.children}
        </span>
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

export const PlacementView = ({
  attributes,
  children,
  element,
  slots,
}: RenderElementProps<PlacementElement>) => {
  const editor = useEditor() as unknown as Editor;
  const path = useElementPath();
  const { index, inspect, openNode, projection, setWorkspace, workspace } =
    useWorkspace();
  const drag = useOutlinerDrag(path ?? []);
  const combo = usePliteCombobox({
    getItems: (trigger, query) => {
      const items =
        trigger === '@'
          ? [...index.nodes.values()].map((node) => ({
              id: node.nodeId,
              label: nodeText(node) || 'Untitled',
            }))
          : trigger === '#'
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
            : trigger === ':'
              ? EMOJI_ITEMS
              : [
                  { id: 'new-child', label: 'New child node' },
                  { id: 'duplicate', label: 'Create shared placement' },
                ];
      return filterComboboxItems(items, query).slice(0, 7);
    },
    onCommit: (item: PliteComboboxItem, state: PliteComboboxState) => {
      if (!path) return;
      editor.update((tx) => {
        const caret = tx.anchor(state.point, {
          association: 'forward',
          deletion: 'nearest',
        });
        tx.text.delete({ at: state.range });
        const point = caret.resolve();
        if (!point) return;
        if (state.trigger === '@') {
          (tx as any).tana.insertReference({
            at: point,
            label: item.label,
            sourceNodeId: element.nodeId,
            targetNodeId: item.id as NodeId,
          });
        } else if (state.trigger === '#') {
          (tx as any).tana.applySupertag({
            definition: index.nodes.get(item.id as NodeId)?.metadata
              .supertagDefinition,
            nodeId: element.nodeId,
            tagId: item.id as NodeId,
          });
        } else if (state.trigger === ':') {
          tx.text.insert(item.id, { at: point });
        } else if (item.id === 'new-child') {
          (tx as any).tana.createNode({ parent: path });
        } else {
          (tx as any).tana.createPlacement({
            at: [...path.slice(0, -1), (path.at(-1) ?? 0) + 1],
            nodeId: element.nodeId,
          });
        }
      });
    },
  });
  if (!path || !projection.isVisible(element.placementId)) return null;
  const collapsed = workspace.collapsedPlacementIds.includes(
    element.placementId
  );
  const node = index.nodes.get(element.nodeId);
  const toggleCollapsed = () =>
    setWorkspace((state) => ({
      ...state,
      collapsedPlacementIds: collapsed
        ? state.collapsedPlacementIds.filter((id) => id !== element.placementId)
        : [...state.collapsedPlacementIds, element.placementId],
    }));
  const select = (event: PointerEvent) => {
    event.preventDefault();
    const current = editor.read.runtime.snapshot().selection;
    const next =
      event.shiftKey && SelectionApi.isNode(current)
        ? selectOutlineRange(projection.topLevelPaths, current, path)
        : event.metaKey && SelectionApi.isNode(current)
          ? toggleOutlineSelection(current, path)
          : SelectionApi.nodes([path]);
    if (next) editor.update((tx) => tx.selection.set(next));
    inspect(element);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      const view = createEditorView(editor, { root: `${element.nodeId}:root` });
      const range = view.read.selection();
      if (!range) return;
      event.preventDefault();
      editor.update((tx) =>
        (tx as any).tana.splitNode({ at: path, nodeId: element.nodeId, range })
      );
    } else if (event.key === 'Tab') {
      event.preventDefault();
      editor.update((tx) =>
        event.shiftKey
          ? (tx as any).tana.outdentPlacement({ at: path })
          : (tx as any).tana.indentPlacement({ at: path })
      );
    } else if (event.key === 'Backspace' && node && nodeText(node) === '') {
      event.preventDefault();
      editor.update((tx) => (tx as any).tana.deletePlacement({ at: path }));
    } else if (event.key === 'Backspace') {
      const view = createEditorView(editor, { root: `${element.nodeId}:root` });
      if (view.read.selection()?.anchor.offset === 0) {
        event.preventDefault();
        editor.update((tx) =>
          (tx as any).tana.mergeBackward({ at: path, nodeId: element.nodeId })
        );
      }
    }
  };
  const isDropTarget = Boolean(
    drag.drop && PathApi.equals(drag.drop.target, path)
  );
  return (
    <div
      {...attributes}
      className={`placement ${isDropTarget ? `drop-${drag.drop?.intent}` : ''} ${workspace.zoomedPlacementId === element.placementId ? 'zoom-target' : ''}`}
      data-placement-id={element.placementId}
    >
      <div className="placement-line">
        <button
          type="button"
          className={`disclosure ${collapsed ? 'is-collapsed' : ''}`}
          contentEditable={false}
          onClick={(event) => {
            event.preventDefault();
            toggleCollapsed();
          }}
          aria-label={collapsed ? 'Expand' : 'Collapse'}
        >
          ⌄
        </button>
        <button
          type="button"
          className="bullet"
          contentEditable={false}
          aria-grabbed={drag['aria-grabbed']}
          onPointerDown={(event) => {
            select(event);
            drag.onPointerDown(event);
          }}
          onDoubleClick={() => openNode(element.nodeId)}
          aria-label="Select and drag node"
        >
          <span />
        </button>
        <div
          className="node-content"
          onKeyDownCapture={(event) => {
            combo.onKeyDown(event);
            if (!event.defaultPrevented) keyDown(event);
          }}
        >
          {slots.contentRoot('body', {
            ariaLabel: `Node ${element.nodeId}`,
            className: 'node-root-editor',
            domStrategy: 'full',
            placeholder: 'Write something...',
          })}
          {combo.state && combo.items.length > 0 && (
            <PliteCombobox
              activeIndex={combo.activeIndex}
              items={combo.items}
              onChoose={combo.choose}
              title={
                combo.state.trigger === '@'
                  ? 'Reference a node'
                  : combo.state.trigger === '#'
                    ? 'Apply supertag'
                    : combo.state.trigger === ':'
                      ? 'Emoji'
                      : 'Commands'
              }
            />
          )}
        </div>
        <button
          type="button"
          className="row-action"
          contentEditable={false}
          onClick={() =>
            editor.update((tx) =>
              (tx as any).tana.createNode({ at: PathApi.next(path) })
            )
          }
          aria-label="Add node after"
        >
          +
        </button>
      </div>
      {!collapsed && <div className="placement-children">{children}</div>}
      <button
        type="button"
        className="placement-remove"
        onClick={() =>
          editor.update((tx) => (tx as any).tana.deletePlacement({ at: path }))
        }
      >
        Remove
      </button>
    </div>
  );
};

const Reference = ({
  attributes,
  children,
  element,
}: RenderElementProps<ReferenceElement>) => {
  const { index, openNode } = useWorkspace();
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
