import { SelectionApi } from '@platejs/plite';
import {
  moveOutlineSelection,
  OutlinerDragProvider,
  restrictOutlineSelection,
} from '@platejs/plite-outliner';
import { Editable, Plite } from '@platejs/plite-react';
import { type RefObject, useEffect, useMemo } from 'react';

import { useWorkspace } from '../workspace/WorkspaceShell';
import { PlacementView, renderElement } from './PlacementView';

export const OutlineSurface = ({
  onCommit,
  scrollContainerRef,
}: {
  onCommit: () => void;
  scrollContainerRef: RefObject<HTMLElement | null>;
}) => {
  const { editor, projection } = useWorkspace();
  const visibleKeys = useMemo(
    () =>
      new Set(
        projection.rootPaths.map((path) =>
          editor.read((state) => state.key(path))
        )
      ),
    [editor, projection.rootPaths]
  );

  useEffect(() => {
    const { selection } = editor.read.runtime.snapshot();
    if (!SelectionApi.isNode(selection)) return;
    const restricted = restrictOutlineSelection(
      projection.visiblePathsInOutlineOrder,
      selection
    );
    if (!SelectionApi.equals(selection, restricted)) {
      editor.update((tx) => tx.selection.set(restricted));
    }
  }, [editor, projection.visiblePathsInOutlineOrder]);

  return (
    <div className="outline-paper">
      <OutlinerDragProvider
        editor={editor}
        onDrop={({ intent, source, target }) =>
          editor.update((tx) =>
            tx.tana.movePlacement({ at: source, intent, target })
          )
        }
        scrollContainerRef={scrollContainerRef}
        visiblePaths={projection.visiblePathsInOutlineOrder}
      >
        <Plite editor={editor} onCommit={onCommit}>
          <Editable
            aria-label="Local Tana outline"
            className="outline-editor"
            domStrategy="full"
            filterTopLevelNodeKey={(key) => visibleKeys.has(key)}
            onKeyDown={(event) => {
              const { selection } = editor.read.runtime.snapshot();
              const { key, shiftKey } = event;
              if (!SelectionApi.isNode(selection)) return;
              if (key === 'ArrowDown' || key === 'ArrowUp') {
                event.preventDefault();
                const next = moveOutlineSelection(
                  projection.visiblePathsInOutlineOrder,
                  selection,
                  key === 'ArrowDown' ? 1 : -1,
                  shiftKey
                );
                editor.update((tx) => tx.selection.set(next));
              } else if (key === 'Backspace' || key === 'Delete') {
                event.preventDefault();
                editor.update((tx) =>
                  tx.tana.deletePlacement({ at: selection })
                );
              } else if (key === 'Tab') {
                event.preventDefault();
                editor.update((tx) =>
                  shiftKey
                    ? tx.tana.outdentPlacement({ at: selection })
                    : tx.tana.indentPlacement({ at: selection })
                );
              }
            }}
            renderElement={renderElement}
          />
        </Plite>
      </OutlinerDragProvider>
    </div>
  );
};

export { PlacementView };
