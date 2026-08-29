import { PathApi, SelectionApi, type NodeSelection, type Path } from '@platejs/plite';

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
  return paths.length > 0 ? SelectionApi.nodes(paths as [Path, ...Path[]]) : null;
};

/** Toggle one visible outline block without reimplementing selection rules in a host. */
export const toggleOutlineSelection = (
  current: NodeSelection | null,
  target: Path
): NodeSelection | null => {
  const paths = current?.paths ?? [];
  const existing = paths.some((path) => PathApi.equals(path, target));
  const next = existing
    ? paths.filter((path) => !PathApi.equals(path, target))
    : [...paths, target];
  return next.length > 0 ? SelectionApi.nodes(next as [Path, ...Path[]]) : null;
};
