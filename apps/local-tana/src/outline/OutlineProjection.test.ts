import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildTanaIndex, createStarterDocument } from '@platejs/tana';

import { initialWorkspace } from '../workspace/WorkspaceState';
import { createOutlineProjection } from './OutlineProjection';

describe('OutlineProjection', () => {
  it('owns complete visible outline order and excludes collapsed descendants', () => {
    const index = buildTanaIndex(createStarterDocument());
    const full = createOutlineProjection(index, initialWorkspace);
    assert.deepEqual(full.visiblePathsInOutlineOrder, [
      [0],
      [1],
      [1, 1],
      [1, 2],
      [1, 3],
      [2],
      [2, 1],
    ]);
    const principles = index.children.get('root')?.[1];
    assert.ok(principles);
    const collapsed = createOutlineProjection(index, {
      ...initialWorkspace,
      collapsedPlacementIds: [principles],
    });
    assert.deepEqual(collapsed.visiblePathsInOutlineOrder, [
      [0],
      [1],
      [2],
      [2, 1],
    ]);
  });

  it('treats zoom target as the view root and ancestors as mount-only wrappers', () => {
    const index = buildTanaIndex(createStarterDocument());
    const principles = index.children.get('root')?.[1];
    const zoomTarget = principles && index.children.get(principles)?.[1];
    assert.ok(principles && zoomTarget);
    const projection = createOutlineProjection(index, {
      ...initialWorkspace,
      collapsedPlacementIds: [principles],
      zoomedPlacementId: zoomTarget,
    });
    assert.deepEqual(projection.visiblePathsInOutlineOrder, [[1, 2]]);
    assert.deepEqual(projection.rootPaths, [[1]]);
    assert.equal(projection.isAncestor(principles), true);
    assert.equal(projection.isVisible(principles), false);
    assert.equal(projection.isVisible(zoomTarget), true);
  });

  it('filters in canonical order while retaining only required ancestors', () => {
    const index = buildTanaIndex(createStarterDocument());
    const projection = createOutlineProjection(
      index,
      initialWorkspace,
      'many places'
    );
    assert.deepEqual(projection.visiblePathsInOutlineOrder, [
      [1],
      [1, 1],
      [2],
      [2, 1],
    ]);
    assert.deepEqual(projection.rootPaths, [[1], [2]]);
  });
});
