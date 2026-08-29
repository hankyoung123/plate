import {
  DndRuntimeProvider,
  type DndPointerGeometry,
  useDndItem,
} from '@platejs/dnd';
import {
  type EditorSelection,
  type NodeSelection,
  type Path,
  PathApi,
  SelectionApi,
} from '@platejs/plite';
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import type { OutlinerDropIntent } from './outliner-extension';
import { restrictOutlineSelection } from './selection';

export type OutlinerDrop = Readonly<{
  intent: OutlinerDropIntent;
  source: NodeSelection;
  target: Path;
}>;

type OutlinerDragItem = Readonly<{ source: NodeSelection }>;
type OutlinerDragEditor = Readonly<{
  read: Readonly<{
    runtime: Readonly<{
      snapshot: () => Readonly<{ selection: EditorSelection | null }>;
    }>;
  }>;
}>;
type OutlinerDragContextValue = Readonly<{
  editor: OutlinerDragEditor;
  onDrop: (drop: OutlinerDrop) => void;
  visiblePaths: readonly Path[];
}>;

const OutlinerDragContext = createContext<OutlinerDragContextValue | null>(
  null
);
const DRAG_TYPE = 'plite-outline-block';

const includesPath = (selection: NodeSelection, target: Path) =>
  selection.paths.some((path) => PathApi.equals(path, target));

const resolveIntent = ({ client, rect }: DndPointerGeometry) => {
  const vertical = (client.y - rect.top) / Math.max(rect.height, 1);
  if (vertical < 0.25) return 'before' as const;
  if (vertical > 0.75) return 'after' as const;
  const horizontal = (client.x - rect.left) / Math.max(rect.width, 1);
  return horizontal > 0.25 ? ('child' as const) : ('after' as const);
};

export const OutlinerDragProvider = ({
  children,
  editor,
  onDrop,
  scrollContainerRef,
  visiblePaths,
}: {
  children: ReactNode;
  editor: OutlinerDragEditor;
  onDrop: (drop: OutlinerDrop) => void;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  visiblePaths: readonly Path[];
}) => {
  const value = useMemo(
    () => ({ editor, onDrop, visiblePaths }),
    [editor, onDrop, visiblePaths]
  );
  return (
    <DndRuntimeProvider scrollContainerRef={scrollContainerRef}>
      <OutlinerDragContext.Provider value={value}>
        {children}
      </OutlinerDragContext.Provider>
    </DndRuntimeProvider>
  );
};

/** Bind one projected outline row to the shared DnD runtime. */
export const useOutlinerDrag = (path: Path) => {
  const context = useContext(OutlinerDragContext);
  if (!context) {
    throw new Error(
      'useOutlinerDrag must be used inside OutlinerDragProvider.'
    );
  }
  const { editor, onDrop, visiblePaths } = context;
  const getItem = useCallback((): OutlinerDragItem => {
    const current = editor.read.runtime.snapshot().selection;
    const restricted = SelectionApi.isNode(current)
      ? restrictOutlineSelection(visiblePaths, current)
      : null;
    return {
      source:
        restricted && includesPath(restricted, path)
          ? restricted
          : SelectionApi.nodes([path]),
    };
  }, [editor, path, visiblePaths]);
  return useDndItem<OutlinerDragItem, OutlinerDrop>({
    canDrop: ({ source }) =>
      !source.paths.some(
        (sourcePath) =>
          PathApi.equals(sourcePath, path) ||
          PathApi.isAncestor(sourcePath, path)
      ),
    getItem,
    onDrop,
    resolveDrop: ({ source }, geometry) => ({
      intent: resolveIntent(geometry),
      source,
      target: path,
    }),
    type: DRAG_TYPE,
  });
};
