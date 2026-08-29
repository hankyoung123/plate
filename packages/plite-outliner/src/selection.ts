import {
  PathApi,
  SelectionApi,
  type NodeSelection,
  type Path,
} from '@platejs/plite';

const pathIndex = (paths: readonly Path[], target: Path) =>
  paths.findIndex((path) => PathApi.equals(path, target));

/** Resolve a shift-click into a canonical selection over a visible outline. */
export const selectOutlineRange = (
  visiblePaths: readonly Path[],
  current: NodeSelection | null,
  target: Path
): NodeSelection | null => {
  if (!current) return SelectionApi.nodes([target]);
  const anchor = pathIndex(visiblePaths, current.anchorPath);
  const focus = pathIndex(visiblePaths, target);
  if (anchor < 0 || focus < 0) return SelectionApi.nodes([target]);
  const [start, end] = anchor < focus ? [anchor, focus] : [focus, anchor];
  const paths = visiblePaths.slice(start, end + 1);
  return paths.length > 0
    ? SelectionApi.nodes(paths as [Path, ...Path[]])
    : null;
};

/** Toggle one visible outline block without reimplementing selection rules in a host. */
export const toggleOutlineSelection = (
  visiblePaths: readonly Path[],
  current: NodeSelection | null,
  target: Path
): NodeSelection | null => {
  if (pathIndex(visiblePaths, target) < 0) return current;
  const paths = (current?.paths ?? []).filter(
    (path) => pathIndex(visiblePaths, path) >= 0
  );
  const existing = paths.some((path) => PathApi.equals(path, target));
  const next = existing
    ? paths.filter((path) => !PathApi.equals(path, target))
    : [...paths, target];
  return next.length > 0 ? SelectionApi.nodes(next as [Path, ...Path[]]) : null;
};

/** Remove paths that are no longer present in the visible outline projection. */
export const restrictOutlineSelection = (
  visiblePaths: readonly Path[],
  current: NodeSelection
): NodeSelection | null => {
  const paths = current.paths.filter(
    (path) => pathIndex(visiblePaths, path) >= 0
  );
  const first = paths[0];
  if (!first) return null;
  const anchorPath = paths.some((path) =>
    PathApi.equals(path, current.anchorPath)
  )
    ? current.anchorPath
    : first;
  const focusPath = paths.some((path) =>
    PathApi.equals(path, current.focusPath)
  )
    ? current.focusPath
    : (paths.at(-1) ?? first);
  return SelectionApi.nodes(paths as [Path, ...Path[]], {
    anchorPath,
    focusPath,
  });
};

/** Move or extend a node selection strictly within projected outline order. */
export const moveOutlineSelection = (
  visiblePaths: readonly Path[],
  current: NodeSelection,
  direction: -1 | 1,
  extend = false
): NodeSelection => {
  const focus = pathIndex(visiblePaths, current.focusPath);
  const next =
    visiblePaths[
      Math.max(0, Math.min(visiblePaths.length - 1, focus + direction))
    ];
  if (!next) return current;
  if (!extend) return SelectionApi.nodes([next]);
  return selectOutlineRange(visiblePaths, current, next) ?? current;
};
