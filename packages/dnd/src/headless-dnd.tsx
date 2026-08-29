import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  DndProvider as ReactDndProvider,
  type DropTargetMonitor,
  useDrag,
  useDrop,
} from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { Scroller } from './DndScroller';

type DndRuntimeContextValue = Readonly<{
  setDragging: (dragging: boolean) => void;
}>;

const DndRuntimeContext = createContext<DndRuntimeContextValue | null>(null);

/** Shared React DnD lifecycle and autoscroll owner for non-Plate consumers. */
export const DndRuntimeProvider = ({
  children,
  scrollContainerRef,
}: {
  children: ReactNode;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
}) => {
  const [dragging, setDragging] = useState(false);
  const context = React.useMemo(() => ({ setDragging }), [setDragging]);
  return (
    <ReactDndProvider backend={HTML5Backend}>
      <DndRuntimeContext.Provider value={context}>
        {children}
        <Scroller
          containerRef={scrollContainerRef}
          enabled={dragging}
          scrollAreaProps={{ 'aria-hidden': true }}
        />
      </DndRuntimeContext.Provider>
    </ReactDndProvider>
  );
};

export type DndPointerGeometry = Readonly<{
  client: Readonly<{ x: number; y: number }>;
  rect: DOMRect;
}>;

export const useDndItem = <TItem extends object, TDrop>({
  canDrop,
  getItem,
  onDrop,
  resolveDrop,
  type,
}: {
  canDrop?: (item: TItem) => boolean;
  getItem: () => TItem;
  onDrop: (drop: TDrop) => void;
  resolveDrop: (item: TItem, geometry: DndPointerGeometry) => TDrop | null;
  type: string;
}) => {
  const runtime = useContext(DndRuntimeContext);
  if (!runtime) {
    throw new Error('useDndItem must be used inside DndRuntimeProvider.');
  }
  const nodeRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const [dropValue, setDropValue] = useState<TDrop | null>(null);
  const resolve = useCallback(
    (item: TItem, monitor: DropTargetMonitor<TItem>) => {
      const node = nodeRef.current;
      const client = monitor.getClientOffset();
      if (!node || !client) return null;
      return resolveDrop(item, {
        client,
        rect: node.getBoundingClientRect(),
      });
    },
    [resolveDrop]
  );
  const [{ isDragging }, drag, preview] = useDrag<
    TItem,
    void,
    { isDragging: boolean }
  >({
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    end: () => runtime.setDragging(false),
    item: () => {
      runtime.setDragging(true);
      return getItem();
    },
    type,
  });
  const [{ isOver }, drop] = useDrop<TItem, void, { isOver: boolean }>({
    accept: type,
    canDrop: (item) => canDrop?.(item) ?? true,
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
    drop: (item, monitor) => {
      const value = resolve(item, monitor);
      if (value) onDrop(value);
    },
    hover: (item, monitor) => setDropValue(resolve(item, monitor)),
  });
  useEffect(() => {
    drop(nodeRef);
    preview(previewRef);
    return () => {
      drop(null);
      preview(null);
    };
  }, [drop, preview]);
  const handleRef = useCallback(
    (node: HTMLElement | null) => {
      drag(node);
    },
    [drag]
  );
  const setNodeRef = useCallback((node: HTMLElement | null) => {
    nodeRef.current = node;
  }, []);
  const setPreviewRef = useCallback((node: HTMLElement | null) => {
    previewRef.current = node;
  }, []);
  return {
    drop: isOver ? dropValue : null,
    handleRef,
    isDragging,
    isOver,
    nodeRef: setNodeRef,
    previewRef: setPreviewRef,
  };
};
