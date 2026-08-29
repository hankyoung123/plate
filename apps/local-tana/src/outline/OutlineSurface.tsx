import { OutlinerDragProvider } from '@platejs/plite-outliner';
import { Editable, Plite } from '@platejs/plite-react';
import { useCallback, useMemo } from 'react';

import { useWorkspace } from '../workspace/WorkspaceShell';
import { PlacementView, renderElement } from './PlacementView';

export const OutlineSurface = ({ onCommit }: { onCommit: () => void }) => {
  const { editor, index, projection } = useWorkspace();
  const visibleKeys = useMemo(
    () =>
      new Set(
        projection.topLevelPaths.map((path) =>
          editor.read((state) => state.key(path))
        )
      ),
    [editor, projection]
  );
  const resolvePath = useCallback(
    (placementId: string) => index.placements.get(placementId as never)?.path,
    [index]
  );
  return (
    <div className="outline-paper">
      <OutlinerDragProvider
        editor={editor as any}
        onDrop={({ intent, source, target }) =>
          editor.update((tx) =>
            (tx as any).tana.movePlacement({ at: source, intent, target })
          )
        }
        resolvePath={resolvePath}
      >
        <Plite editor={editor as any} onCommit={onCommit}>
          <Editable
            aria-label="Local Tana outline"
            className="outline-editor"
            domStrategy="full"
            filterTopLevelNodeKey={(key) => visibleKeys.has(key)}
            renderElement={renderElement}
          />
        </Plite>
      </OutlinerDragProvider>
    </div>
  );
};

export { PlacementView };
