import type { Path } from '@platejs/plite';
import {
  type NodeId,
  type PlacementId,
  nodeText,
  type TanaIndex,
} from '@platejs/tana';

import type { WorkspaceState } from '../workspace/WorkspaceState';

export type OutlineProjection = Readonly<{
  isVisible: (placementId: PlacementId) => boolean;
  topLevelPaths: readonly Path[];
  visiblePlacementIds: ReadonlySet<PlacementId>;
}>;

const descendantsOf = (
  index: TanaIndex,
  placementId: PlacementId
): readonly PlacementId[] => index.descendants.get(placementId) ?? [];

const matchesQuery = (
  index: TanaIndex,
  placementId: PlacementId,
  query: string
) => {
  if (!query.trim()) return true;
  const record = index.placements.get(placementId);
  const node = record && index.nodes.get(record.nodeId);
  return Boolean(
    node &&
    nodeText(node).toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
};

/** Project canonical Placements into the only outline view that may mount. */
export const createOutlineProjection = (
  index: TanaIndex,
  workspace: WorkspaceState,
  query = ''
): OutlineProjection => {
  const root = index.children.get('root') ?? [];
  const visible = new Set<PlacementId>(index.placements.keys());
  const zoomed = workspace.zoomedPlacementId;

  if (zoomed) {
    visible.clear();
    const target = index.placements.get(zoomed);
    if (target) {
      target.ancestors.forEach((id) => visible.add(id));
      visible.add(zoomed);
      descendantsOf(index, zoomed).forEach((id) => visible.add(id));
    }
  }

  for (const collapsed of workspace.collapsedPlacementIds) {
    for (const descendant of descendantsOf(index, collapsed)) {
      visible.delete(descendant);
    }
  }

  if (query.trim()) {
    const matches = new Set<PlacementId>();
    for (const [placementId] of index.placements) {
      if (!matchesQuery(index, placementId, query)) continue;
      matches.add(placementId);
      const record = index.placements.get(placementId);
      record?.ancestors.forEach((ancestor) => matches.add(ancestor));
    }
    for (const id of [...visible]) if (!matches.has(id)) visible.delete(id);
  }

  const topLevelPaths = root
    .filter((placementId) => visible.has(placementId))
    .map((placementId) => index.placements.get(placementId)?.path)
    .filter((path): path is Path => Boolean(path));

  return {
    isVisible: (placementId) => visible.has(placementId),
    topLevelPaths,
    visiblePlacementIds: visible,
  };
};

export const placementNodeId = (
  index: TanaIndex,
  id: PlacementId
): NodeId | undefined => index.placements.get(id)?.nodeId;
