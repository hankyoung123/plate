import type { NodeId, PlacementId } from '@platejs/tana';

export type WorkspaceState = Readonly<{
  activeNodeId?: NodeId;
  activePlacementId?: PlacementId;
  collapsedPlacementIds: readonly PlacementId[];
  dialog?: 'command' | 'help' | 'references' | null;
  inspectorOpen: boolean;
  search: string;
  sidebarOpen: boolean;
  tabs: readonly NodeId[];
  zoomedPlacementId?: PlacementId;
}>;

export const initialWorkspace: WorkspaceState = {
  collapsedPlacementIds: [],
  dialog: null,
  inspectorOpen: true,
  search: '',
  sidebarOpen: true,
  tabs: [],
};
