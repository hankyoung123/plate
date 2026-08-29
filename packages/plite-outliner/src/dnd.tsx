import type { Editor, NodeSelection, Path } from '@platejs/plite';
import { SelectionApi } from '@platejs/plite';
import React, {
  createContext,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { OutlinerDropIntent } from './outliner-extension';

export type OutlinerDrop = Readonly<{
  intent: OutlinerDropIntent;
  source: NodeSelection;
  target: Path;
}>;

type OutlinerDragContextValue = Readonly<{
  bind: (path: Path) => Readonly<{
    'aria-grabbed': boolean;
    onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  }>;
  drop: OutlinerDrop | null;
}>;

const OutlinerDragContext = createContext<OutlinerDragContextValue | null>(null);

export const OutlinerDragProvider = ({
  children,
  editor,
  onDrop,
  resolvePath,
}: {
  children: ReactNode;
  editor: Editor;
  onDrop: (drop: OutlinerDrop) => void;
  resolvePath: (placementId: string) => Path | undefined;
}) => {
  const [active, setActive] = useState(false);
  const [drop, setDrop] = useState<OutlinerDrop | null>(null);
  const source = useRef<{ selection: NodeSelection; x: number; y: number } | null>(null);

  const onPointerMove = useCallback((event: globalThis.PointerEvent) => {
    const active = source.current;
    if (!active) return;
    const distance = Math.hypot(event.clientX - active.x, event.clientY - active.y);
    if (distance < 4) return;
    const targetElement = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-placement-id]');
    const placementId = targetElement?.dataset.placementId;
    const target = placementId ? resolvePath(placementId) : undefined;
    if (!targetElement || !target || active.selection.paths.some((path) => path.join('.') === target.join('.'))) {
      setDrop(null);
      return;
    }
    const rect = targetElement.getBoundingClientRect();
    const intent: OutlinerDropIntent = event.clientX - rect.left > 48
      ? 'child'
      : event.clientY - rect.top < rect.height / 2
        ? 'before'
        : 'after';
    setDrop({ intent, source: active.selection, target });
    const scrollParent = targetElement.closest<HTMLElement>('.workspace-canvas');
    if (scrollParent) {
      const edge = 56;
      if (event.clientY < edge) scrollParent.scrollBy({ top: -12 });
      else if (event.clientY > window.innerHeight - edge) scrollParent.scrollBy({ top: 12 });
    }
  }, [resolvePath]);

  const finish = useCallback(() => {
    const current = drop;
    source.current = null;
    setActive(false);
    setDrop(null);
    if (current) onDrop(current);
  }, [drop, onDrop]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
    };
  }, [active, finish, onPointerMove]);

  const bind = useCallback((path: Path) => ({
    'aria-grabbed': Boolean(drop?.source.paths.some((candidate) => candidate.join('.') === path.join('.'))),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const selection = editor.read.runtime.snapshot().selection;
      source.current = {
        selection: SelectionApi.isNode(selection) && selection.paths.some((candidate) => candidate.join('.') === path.join('.'))
          ? selection
          : SelectionApi.nodes([path]),
        x: event.clientX,
        y: event.clientY,
      };
      setActive(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
  }), [drop, editor]);

  return <OutlinerDragContext.Provider value={{ bind, drop }}>{children}</OutlinerDragContext.Provider>;
};

export const useOutlinerDrag = (path: Path) => {
  const value = useContext(OutlinerDragContext);
  if (!value) throw new Error('useOutlinerDrag must be used inside OutlinerDragProvider.');
  return { ...value.bind(path), drop: value.drop };
};
