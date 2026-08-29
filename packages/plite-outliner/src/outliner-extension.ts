import {
  ContentSlice,
  defineExtension,
  type Element,
  type EditorUpdateTransaction,
  type NamedRootKey,
  type NodeSelection,
  NodeApi,
  type Path,
  PathApi,
  type Point,
  type Range,
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

export type OutlinerSplitInput = OutlinerTarget &
  Readonly<{
    block: Element;
    range: Range;
    sourceRoot: NamedRootKey;
    targetProperties?: Readonly<Record<string, unknown>>;
    targetRoot: NamedRootKey;
    type: string;
  }>;

export type OutlinerMergeInput = OutlinerTarget &
  Readonly<{
    childType?: string;
    sourceRoot: NamedRootKey;
    targetRoot: NamedRootKey;
  }>;

export type OutlinerTxApi = {
  insertSibling: (input: OutlinerInsertInput) => void;
  mergeBackward: (input: OutlinerMergeInput) => boolean;
  move: (input: OutlinerMoveInput) => void;
  nest: (input: OutlinerTarget) => void;
  splitAtSelection: (input: OutlinerSplitInput) => boolean;
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
  const last = selectable.at(-1);
  if (!first || !last) return;
  tx.selection.setNodes(selectable, { anchor: first, focus: last });
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
  mergeBackward({ at, childType, sourceRoot, targetRoot }) {
    if (!PathApi.hasPrevious(at)) return false;
    const source = tx.value().roots?.[sourceRoot]?.[0];
    const target = tx.value().roots?.[targetRoot]?.[0];
    if (!source || !target || !NodeApi.isElement(source)) return false;

    const targetPoint = tx.points.end({ path: [0, 0, 0], offset: 0, root: targetRoot });
    if (!targetPoint) return false;
    const caret = tx.anchor(targetPoint, {
      association: 'backward',
      deletion: 'nearest',
    });
    const inserted = tx.slice.replace(ContentSlice.closed(source.children), {
      at: targetPoint,
    });
    if (!inserted) return false;

    if (childType) {
      while (true) {
        const index = tx.nodes
          .children(at)
          .findIndex((node) => NodeApi.isElement(node) && node.type === childType);
        if (index < 0) break;
        tx.nodes.move({
          at: [...at, index],
          to: [...PathApi.previous(at), tx.nodes.children(PathApi.previous(at)).length],
        });
      }
    }
    tx.nodes.remove({ at });
    const resolved = caret.resolve();
    if (resolved) tx.selection.set(resolved);
    return true;
  },
  move({ at, intent, target }) {
    const paths = selectedPaths(at);
    assertMovable(paths, target);
    const destination = adjustDestinationAfterRemoval(
      insertionPath(tx, intent, target),
      paths
    );
    const selection = SelectionApi.isNode(at) ? at : SelectionApi.nodes([at]);
    tx.nodes.move({ at: selection, to: destination });
  },
  nest({ at }) {
    if (!PathApi.hasPrevious(at)) return;
    const parent = PathApi.previous(at);
    tx.nodes.move({ at, to: [...parent, tx.nodes.children(parent).length] });
  },
  splitAtSelection({
    at,
    block,
    range,
    sourceRoot,
    targetProperties,
    targetRoot,
    type,
  }) {
    tx.nodes.split({ at: range, always: true, type });
    const roots = tx.value().roots?.[sourceRoot];
    const leading = roots?.[0];
    const trailing = roots?.[1];
    if (!leading || !trailing || !NodeApi.isElement(trailing)) return false;

    tx.roots.replace(sourceRoot, [leading]);
    tx.roots.create(targetRoot, [
      { ...trailing, ...targetProperties } as Element,
    ]);
    tx.blocks.insertAfter(block, { at });
    const point = tx.points.start({ path: [0, 0, 0], offset: 0, root: targetRoot });
    if (point) tx.selection.set(point);
    return true;
  },
  unnest({ at }) {
    if (at.length < 2) return;
    tx.nodes.move({ at, to: PathApi.next(PathApi.parent(at)) });
  },
});

/** Install generic, domain-free outline tree mutations as `tx.outliner.*`. */
export const outliner = () =>
  defineExtension('outliner', {
    update: ({ tx }) => createOutlinerUpdate(tx),
  });

export type OutlinerExtension = ReturnType<typeof outliner>;
export type OutlinerEditorValue = Value;
