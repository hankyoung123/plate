import {
  PliteCombobox,
  type PliteComboboxItem,
  type PliteComboboxState,
  usePliteCombobox,
} from '@platejs/combobox';
import { createEditorView, PathApi, SelectionApi } from '@platejs/plite';
import {
  resolveOutlinerInteraction,
  selectOutlineRange,
  toggleOutlineSelection,
  useOutlinerDrag,
} from '@platejs/plite-outliner';
import type { RenderElementProps } from '@platejs/plite-react';
import { useEditorComposing, useElementPath } from '@platejs/plite-react';
import {
  filterComboboxItems,
  nodeRoot,
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
  const path = useElementPath();
  const composing = useEditorComposing();
  const {
    editor,
    index,
    inspect,
    openNode,
    projection,
    setWorkspace,
    workspace,
  } = useWorkspace();
  const { drop, handleRef, isDragging, isOver, nodeRef, previewRef } =
    useOutlinerDrag(path ?? []);
  const collapsed = workspace.collapsedPlacementIds.includes(
    element.placementId
  );
  const toggleCollapsed = () =>
    setWorkspace((state) => ({
      ...state,
      collapsedPlacementIds: collapsed
        ? state.collapsedPlacementIds.filter((id) => id !== element.placementId)
        : [...state.collapsedPlacementIds, element.placementId],
    }));
  const combo = usePliteCombobox({
    getItems: (trigger, query) => {
      const items =
        trigger === '@'
          ? [...index.nodes.values()].map((node) => ({
              id: node.nodeId,
              label: nodeText(node, index.nodes) || 'Untitled',
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
          tx.tana.insertReference({
            at: point,
            sourceNodeId: element.nodeId,
            targetNodeId: item.id as NodeId,
          });
        } else if (state.trigger === '#') {
          const tagId = item.id as NodeId;
          tx.tana.applySupertag({
            definition: index.nodes.get(tagId)?.metadata.supertagDefinition,
            nodeId: element.nodeId,
            tagId,
          });
        } else if (state.trigger === ':') {
          tx.text.insert(item.id, { at: point });
        } else if (item.id === 'new-child') {
          tx.tana.createNode({ parent: path });
        } else {
          tx.tana.createPlacement({
            at: PathApi.next(path),
            nodeId: element.nodeId,
          });
        }
      });
    },
  });

  if (!path) return null;
  if (projection.isAncestor(element.placementId)) {
    return (
      <div {...attributes} className="projection-ancestor">
        {children}
      </div>
    );
  }
  if (!projection.isVisible(element.placementId)) return null;

  const select = (event: PointerEvent) => {
    event.preventDefault();
    const current = editor.read.runtime.snapshot().selection;
    const next =
      event.shiftKey && SelectionApi.isNode(current)
        ? selectOutlineRange(
            projection.visiblePathsInOutlineOrder,
            current,
            path
          )
        : (event.metaKey || event.ctrlKey) && SelectionApi.isNode(current)
          ? toggleOutlineSelection(
              projection.visiblePathsInOutlineOrder,
              current,
              path
            )
          : SelectionApi.nodes([path]);
    if (next) editor.update((tx) => tx.selection.set(next));
    inspect(element);
  };
  const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const view = createEditorView(editor, { root: nodeRoot(element.nodeId) });
    const range = view.read.selection();
    if (!range) return;
    const action = resolveOutlinerInteraction({
      comboboxOpen: combo.isOpen,
      composing: composing || event.nativeEvent.isComposing,
      defaultPrevented: event.defaultPrevented,
      empty: view.read.text.string([]) === '',
      key: event.key,
      nodeCollapsed: collapsed,
      selectionAtRootStart: view.read.points.isStart(range.anchor, []),
      selectionCollapsed: view.read.selection.isCollapsed(),
      shift: event.shiftKey,
    });
    if (action === 'pass') return;
    event.preventDefault();
    if (action === 'expand') {
      toggleCollapsed();
      return;
    }
    editor.update((tx) => {
      if (action === 'split') {
        tx.tana.splitNode({ at: path, nodeId: element.nodeId, range });
      } else if (action === 'nest') {
        tx.tana.indentPlacement({ at: path });
      } else if (action === 'unnest') {
        tx.tana.outdentPlacement({ at: path });
      } else if (action === 'delete-placement') {
        tx.tana.deletePlacement({ at: path });
      } else if (action === 'merge-backward') {
        tx.tana.mergeBackward({ at: path, nodeId: element.nodeId });
      }
    });
  };
  const dropIntent = isOver ? drop?.intent : undefined;

  return (
    <div
      {...attributes}
      className={`placement ${dropIntent ? `drop-${dropIntent}` : ''} ${workspace.zoomedPlacementId === element.placementId ? 'zoom-target' : ''}`}
      ref={(node) => {
        nodeRef(node);
        previewRef(node);
      }}
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
          aria-grabbed={isDragging}
          ref={handleRef}
          onPointerDown={select}
          onDoubleClick={() => openNode(element.nodeId)}
          aria-label="Select and drag node"
        >
          <span />
        </button>
        <div
          className="node-content"
          role="treeitem"
          tabIndex={-1}
          onKeyDown={(event) => {
            combo.onKeyDown(event);
            keyDown(event);
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
              tx.tana.createNode({ at: PathApi.next(path) })
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
          editor.update((tx) => tx.tana.deletePlacement({ at: path }))
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
  const display =
    element.alias ??
    (target ? nodeText(target, index.nodes) || 'Untitled' : 'Missing node');
  return (
    <span
      {...attributes}
      className="reference-chip"
      data-preview={display}
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
      @{display}
      {children}
    </span>
  );
};
