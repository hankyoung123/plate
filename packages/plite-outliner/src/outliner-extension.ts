import {
  defineExtension,
  type Element,
  type EditorUpdateTransaction,
  type NodeSelection,
  NodeApi,
  type Path,
  PathApi,
  SelectionApi,
  type Value,
} from '@platejs/plite';

export type OutlinerDropIntent = 'after' | 'before' | 'child';

export type OutlinerTarget = Readonly<{
  at: Path;
  selection?: NodeSelection;
}>;

export type OutlinerInsertInput = OutlinerTarget & Readonly<{ block: Element }>;

export type OutlinerMoveInput = Readonly<{
  at: Path | NodeSelection;
  intent: OutlinerDropIntent;
  target: Path;
}>;

export type OutlinerTxApi = {
  insertSibling: (input: OutlinerInsertInput) => void;
  mergeBackward: (input: OutlinerTarget) => void;
  moveBlock: (input: OutlinerMoveInput) => void;
  nest: (input: OutlinerTarget) => void;
  splitAtSelection: (input: OutlinerInsertInput) => void;
  unnest: (input: OutlinerTarget) => void;
};

const selectedPaths = (at: Path | NodeSelection): readonly Path[] =>
  SelectionApi.isNode(at) ? at.paths : [at];

const assertMovable = (paths: readonly Path[], target: Path) => {
  for (const path of paths) {
    if (PathApi.equals(path, target) || PathApi.isAncestor(path, target)) {
      throw new Error(
        'Cannot move an outline block into itself or its subtree.'
      );
    }
  }
};

const select = (tx: EditorUpdateTransaction, paths: readonly Path[]) => {
  const selectable = paths.filter((path) => {
    const entry = tx.nodes.get(path);
    return Boolean(entry && tx.nodes.isSelectable(entry[0]));
  });
  const first = selectable[0];
  if (!first) return;
  tx.selection.set(SelectionApi.nodes([first, ...selectable.slice(1)]));
};

const sameParent = (left: Path, right: Path) =>
  left.length === right.length &&
  PathApi.equals(PathApi.parent(left), PathApi.parent(right));

const adjustDestinationAfterRemoval = (
  destination: Path,
  removed: readonly Path[]
): Path => {
  if (destination.length === 0) return destination;
  const parent = PathApi.parent(destination);
  const index = destination.at(-1) ?? 0;
  const removedBefore = removed.filter(
    (path) => sameParent(path, destination) && (path.at(-1) ?? 0) < index
  ).length;
  return [...parent, index - removedBefore];
};

const insertionPath = (
  tx: EditorUpdateTransaction,
  intent: OutlinerDropIntent,
  target: Path
): Path => {
  if (intent === 'before') return target;
  if (intent === 'after') return PathApi.next(target);

  return [...target, tx.nodes.children(target).length];
};

const createOutlinerUpdate = (tx: EditorUpdateTransaction): OutlinerTxApi => ({
  insertSibling({ at, block, selection }) {
    const path = PathApi.next(at);
    tx.blocks.insertAfter(block, { at });
    select(tx, selection?.paths ?? [path]);
  },
  mergeBackward({ at }) {
    if (!PathApi.hasPrevious(at)) return;
    tx.nodes.merge({ at });
  },
  moveBlock({ at, intent, target }) {
    const paths = selectedPaths(at);
    assertMovable(paths, target);
    const rawDestination = insertionPath(tx, intent, target);
    if (paths.length === 1) {
      select(tx, paths);
      tx.nodes.move({
        at: paths[0],
        to: adjustDestinationAfterRemoval(rawDestination, paths),
      });
      return;
    }

    const nodes = paths
      .map((path) => tx.nodes.get(path)?.[0])
      .filter(Boolean) as Element[];
    const destination = adjustDestinationAfterRemoval(rawDestination, paths);
    for (const path of [...paths].sort((a, b) => PathApi.compare(b, a))) {
      tx.nodes.remove({ at: path });
    }
    nodes.forEach((node, index) =>
      tx.nodes.insert(node, {
        at: [...destination.slice(0, -1), (destination.at(-1) ?? 0) + index],
      })
    );
    select(
      tx,
      nodes.map((_, index) => [
        ...destination.slice(0, -1),
        (destination.at(-1) ?? 0) + index,
      ])
    );
  },
  nest({ at }) {
    if (!PathApi.hasPrevious(at)) return;
    const parent = PathApi.previous(at);
    const destination = [...parent, tx.nodes.children(parent).length];
    const node = tx.nodes.get(at)?.[0];
    if (!node || !NodeApi.isElement(node)) return;
    tx.nodes.remove({ at });
    tx.nodes.insert(node, { at: destination });
    select(tx, [destination]);
  },
  splitAtSelection({ at, block, selection }) {
    const path = PathApi.next(at);
    tx.blocks.insertAfter(block, { at });
    select(tx, selection?.paths ?? [path]);
  },
  unnest({ at }) {
    if (at.length < 2) return;
    const parent = PathApi.parent(at);
    const destination = PathApi.next(parent);
    const node = tx.nodes.get(at)?.[0];
    if (!node || !NodeApi.isElement(node)) return;
    tx.nodes.remove({ at });
    tx.nodes.insert(node, { at: destination });
    select(tx, [destination]);
  },
});

/** Install generic, domain-free outline tree mutations as `tx.outliner.*`. */
export const outliner = () =>
  defineExtension('outliner', {
    update: ({ tx }) => createOutlinerUpdate(tx),
  });

export type OutlinerExtension = ReturnType<typeof outliner>;

export type OutlinerEditorValue = Value;
