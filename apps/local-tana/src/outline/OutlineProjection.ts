import type { Path } from '@platejs/plite';
import {
  type NodeId,
  type PlacementId,
  nodeText,
  type TanaIndex,
} from '@platejs/tana';

import type { WorkspaceState } from '../workspace/WorkspaceState';

export type OutlineProjection = Readonly<{
  ancestorPlacementIds: ReadonlySet<PlacementId>;
  isAncestor: (placementId: PlacementId) => boolean;
  isVisible: (placementId: PlacementId) => boolean;
  rootPaths: readonly Path[];
  visiblePathsInOutlineOrder: readonly Path[];
  visiblePlacementIds: readonly PlacementId[];
}>;

const matchesQuery = (
  index: TanaIndex,
  placementId: PlacementId,
  query: string
) => {
  const record = index.placements.get(placementId);
  const node = record && index.nodes.get(record.nodeId);
  return Boolean(
    node &&
    nodeText(node, index.nodes)
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase())
  );
};

/** Derive the sole visible outline order from canonical topology and view state. */
export const createOutlineProjection = (
  index: TanaIndex,
  workspace: WorkspaceState,
  query = ''
): OutlineProjection => {
  const normalizedQuery = query.trim();
  const zoom = workspace.zoomedPlacementId
    ? index.placements.get(workspace.zoomedPlacementId)
    : undefined;
  const viewRoots = zoom
    ? [zoom.placementId]
    : (index.children.get('root') ?? []);
  const included = new Set<PlacementId>();

  if (normalizedQuery) {
    for (const [placementId, record] of index.placements) {
      if (!matchesQuery(index, placementId, normalizedQuery)) continue;
      included.add(placementId);
      record.ancestors.forEach((ancestor) => included.add(ancestor));
    }
  }

  const visiblePlacementIds: PlacementId[] = [];
  const visiblePathsInOutlineOrder: Path[] = [];
  const collapsed = new Set(workspace.collapsedPlacementIds);
  const visit = (placementId: PlacementId) => {
    const record = index.placements.get(placementId);
    if (!record) return;
    const visible = !normalizedQuery || included.has(placementId);
    if (visible) {
      visiblePlacementIds.push(placementId);
      visiblePathsInOutlineOrder.push(record.path);
    }
    if (collapsed.has(placementId)) return;
    for (const child of index.children.get(placementId) ?? []) visit(child);
  };
  viewRoots.forEach(visit);

  const visibleSet = new Set(visiblePlacementIds);
  const ancestorPlacementIds = new Set<PlacementId>(zoom?.ancestors);
  const rootIndexes = new Set<number>();
  for (const path of visiblePathsInOutlineOrder) {
    const rootIndex = path[0];
    if (rootIndex !== undefined) rootIndexes.add(rootIndex);
  }
  if (zoom) {
    const rootIndex = zoom.path[0];
    if (rootIndex !== undefined) rootIndexes.add(rootIndex);
  }
  const rootPaths = [...rootIndexes]
    .toSorted((left, right) => left - right)
    .map((rootIndex) => [rootIndex] as Path);

  return {
    ancestorPlacementIds,
    isAncestor: (placementId) => ancestorPlacementIds.has(placementId),
    isVisible: (placementId) => visibleSet.has(placementId),
    rootPaths,
    visiblePathsInOutlineOrder,
    visiblePlacementIds,
  };
};

export const placementNodeId = (
  index: TanaIndex,
  id: PlacementId
): NodeId | undefined => index.placements.get(id)?.nodeId;
