import {
  createEditorView,
  type Editor,
  type NodeSelection,
  type Path,
  PathApi,
  type Range,
  SelectionApi,
} from '@platejs/plite';
import type {
  OutlinerDropIntent,
  OutlinerTxApi,
} from '@platejs/plite-outliner';

import {
  createNodeWithPlacement,
  isPlacement,
  type NodeId,
  type NodeElement,
  nodeRoot,
  type PlacementElement,
  TANA_NODE_CATALOG_ROOT,
} from './model';

type TxWithOutliner = { outliner: OutlinerTxApi };

export const insertNodeAfter = (editor: Editor, at: Path, text = '') => {
  const created = createNodeWithPlacement(text);
  const catalog = editor.read.root(TANA_NODE_CATALOG_ROOT);
  editor.update((tx) => {
    tx.roots.replace(TANA_NODE_CATALOG_ROOT, [...catalog, created.record]);
    tx.roots.create(created.root, [created.node]);
    (tx as typeof tx & TxWithOutliner).outliner.insertSibling({
      at,
      block: created.placement,
    });
  });
  return created.nodeId;
};

export const splitPlacement = (editor: Editor, at: Path) => {
  const created = createNodeWithPlacement();
  const catalog = editor.read.root(TANA_NODE_CATALOG_ROOT);
  editor.update((tx) => {
    tx.roots.replace(TANA_NODE_CATALOG_ROOT, [...catalog, created.record]);
    tx.roots.create(created.root, [created.node]);
    (tx as typeof tx & TxWithOutliner).outliner.splitAtSelection({
      at,
      block: created.placement,
    });
  });
  return created.nodeId;
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Split one Node body and its Placement in one cross-root Plite transaction. */
export const splitPlacementAtSelection = (
  editor: Editor,
  at: Path,
  nodeId: NodeId,
  selection: Range | null
) => {
  if (
    !selection ||
    (selection.anchor.root !== undefined &&
      selection.anchor.root !== nodeRoot(nodeId))
  ) {
    return splitPlacement(editor, at);
  }
  const body = clone(
    editor.read.root(nodeRoot(nodeId)) as import('./model').TanaValue
  );
  const current = body[0] as import('./model').NodeElement | undefined;
  const paragraphIndex = selection.focus.path[1] ?? 0;
  const leafIndex = selection.focus.path[2] ?? 0;
  const paragraph = current?.children[paragraphIndex];
  const leaf = paragraph?.children[leafIndex];
  if (!current || !paragraph || !leaf || !('text' in leaf)) {
    return splitPlacement(editor, at);
  }

  const created = createNodeWithPlacement();
  const catalog = editor.read.root(TANA_NODE_CATALOG_ROOT);
  const { offset } = selection.focus;
  const beforeLeaf = { ...leaf, text: leaf.text.slice(0, offset) };
  const afterLeaf = { ...leaf, text: leaf.text.slice(offset) };
  const beforeNode = clone(current);
  const afterNode = clone(created.node);
  beforeNode.children = [
    ...current.children.slice(0, paragraphIndex),
    {
      ...paragraph,
      children: [...paragraph.children.slice(0, leafIndex), beforeLeaf],
    },
  ];
  afterNode.children = [
    {
      ...paragraph,
      children: [afterLeaf, ...paragraph.children.slice(leafIndex + 1)],
    },
    ...current.children.slice(paragraphIndex + 1),
  ];
  afterNode.metadata = current.metadata.supertags
    ? { supertags: current.metadata.supertags }
    : {};

  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [beforeNode]);
    tx.roots.replace(TANA_NODE_CATALOG_ROOT, [...catalog, created.record]);
    tx.roots.create(created.root, [afterNode]);
    (tx as typeof tx & TxWithOutliner).outliner.splitAtSelection({
      at,
      block: created.placement,
    });
    const point = { offset: 0, path: [0, 0, 0], root: created.root };
    tx.selection.set(SelectionApi.text({ anchor: point, focus: point }));
  });
  return created.nodeId;
};

export const nestPlacement = (editor: Editor, at: Path) =>
  editor.update((tx) =>
    (tx as typeof tx & TxWithOutliner).outliner.nest({ at })
  );

export const unnestPlacement = (editor: Editor, at: Path) =>
  editor.update((tx) =>
    (tx as typeof tx & TxWithOutliner).outliner.unnest({ at })
  );

export const movePlacements = (
  editor: Editor,
  at: Path | NodeSelection,
  target: Path,
  intent: OutlinerDropIntent
) =>
  editor.update((tx) =>
    (tx as typeof tx & TxWithOutliner).outliner.moveBlock({
      at,
      intent,
      target,
    })
  );

export const removePlacements = (editor: Editor, paths: readonly Path[]) => {
  if (paths.length === 0) return;
  const canonicalPaths = SelectionApi.nodes(paths as [Path, ...Path[]]).paths;

  editor.update((tx) => {
    tx.nodes.remove({ at: SelectionApi.nodes(canonicalPaths) });
    tx.selection.set(null);
  });
};

export const removePlacement = (editor: Editor, at: Path) =>
  removePlacements(editor, [at]);

const lastTextPoint = (node: NodeElement, root: string) => {
  for (
    let paragraphIndex = node.children.length - 1;
    paragraphIndex >= 0;
    paragraphIndex -= 1
  ) {
    const paragraph = node.children[paragraphIndex];
    for (
      let childIndex = paragraph.children.length - 1;
      childIndex >= 0;
      childIndex -= 1
    ) {
      const child = paragraph.children[childIndex];
      if ('text' in child) {
        return {
          offset: child.text.length,
          path: [0, paragraphIndex, childIndex],
          root,
        };
      }
      const text = child.children.at(-1);
      if (text) {
        return {
          offset: text.text.length,
          path: [0, paragraphIndex, childIndex, child.children.length - 1],
          root,
        };
      }
    }
  }
  return { offset: 0, path: [0, 0, 0], root };
};

/** Merge this placement into its previous sibling while preserving shared nodes elsewhere. */
export const mergePlacementBackward = (
  editor: Editor,
  at: Path,
  placement: PlacementElement
) => {
  if (!PathApi.hasPrevious(at)) return false;
  const previousPath = PathApi.previous(at);
  const previous = editor.read.nodes.get(previousPath)?.[0];
  if (!previous || !isPlacement(previous)) return false;

  const previousRoot = nodeRoot(previous.nodeId);
  const currentRoot = nodeRoot(placement.nodeId);
  const previousNode = clone(
    (editor.read.root(previousRoot) as import('./model').TanaValue)[0]
  ) as NodeElement;
  const currentNode = clone(
    (editor.read.root(currentRoot) as import('./model').TanaValue)[0]
  ) as NodeElement;
  const children = placement.children.filter(isPlacement).map(clone);
  const catalog = editor.read.root(TANA_NODE_CATALOG_ROOT);
  const point = lastTextPoint(previousNode, previousRoot);
  const previousLast = previousNode.children.at(-1);
  const currentFirst = currentNode.children[0];
  if (!previousLast || !currentFirst) return false;

  previousNode.children = [
    ...previousNode.children.slice(0, -1),
    {
      ...previousLast,
      children: [...previousLast.children, ...currentFirst.children],
    },
    ...currentNode.children.slice(1),
  ];

  editor.update((tx) => {
    tx.roots.replace(previousRoot, [previousNode]);
    tx.nodes.remove({ at });
    const childIndex = tx.nodes.children(previousPath).length;
    children.forEach((child, index) => {
      tx.nodes.insert(child, { at: [...previousPath, childIndex + index] });
    });
    const remaining = tx.nodes.toArray({
      match: (node) =>
        (node as { type?: string; nodeId?: string }).type === 'placement' &&
        (node as { nodeId?: string }).nodeId === placement.nodeId,
    });
    if (remaining.length === 0) {
      tx.roots.replace(
        TANA_NODE_CATALOG_ROOT,
        catalog.filter(
          (record) =>
            (record as { nodeId?: string }).nodeId !== placement.nodeId
        )
      );
      tx.roots.delete(currentRoot);
    }
    tx.selection.set(SelectionApi.text({ anchor: point, focus: point }));
  });
  return true;
};

export const updateNodeTextView = (editor: Editor, nodeId: NodeId) =>
  createEditorView(editor, { root: nodeRoot(nodeId) });

export const canNest = (at: Path) => PathApi.hasPrevious(at);
export const canUnnest = (at: Path) => at.length > 1;
