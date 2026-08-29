import {
  defineExtension,
  type EditorExtension,
  type EditorUpdateTransaction,
  type NodeSelection,
  type Path,
  PathApi,
  type Point,
  type Range,
  SelectionApi,
} from '@platejs/plite';
import type {
  OutlinerDropIntent,
  OutlinerExtension,
  OutlinerTxApi,
} from '@platejs/plite-outliner';
import type { EditorExtensionDependencyReferenceFor } from '@platejs/plite/internal';

import type { FieldValue } from './field';
import {
  createNodeWithPlacement,
  createPlacement,
  isNodeElement,
  isPlacement,
  nodeRoot,
  type NodeElement,
  type NodeId,
  type PlacementId,
  type SupertagDefinition,
  TANA_NODE_CATALOG_ROOT,
  TanaSchema,
  type TanaDocument,
  type TanaValue,
} from './model';
import { buildTanaIndex } from './query';
import { createReference } from './reference';
import { withFieldValue, withSupertag, withoutSupertag } from './supertag';

export type TanaCreateNodeInput = Readonly<{
  at?: Path;
  metadata?: NodeElement['metadata'];
  parent?: Path;
  text?: string;
}>;

export type TanaCreatePlacementInput = Readonly<{
  at: Path;
  nodeId: NodeId;
}>;

export type TanaDeletePlacementInput = Readonly<{
  at: Path | NodeSelection;
}>;

export type TanaDeleteNodeInput = Readonly<{
  nodeId: NodeId;
}>;

export type TanaSplitNodeInput = Readonly<{
  at: Path;
  nodeId: NodeId;
  range: Range;
}>;

export type TanaMergeBackwardInput = Readonly<{
  at: Path;
  nodeId: NodeId;
}>;

export type TanaInsertReferenceInput = Readonly<{
  alias?: string;
  at: Point;
  sourceNodeId: NodeId;
  targetNodeId: NodeId;
}>;

export type TanaRemoveReferenceInput = Readonly<{
  at: Path;
  sourceNodeId: NodeId;
}>;

export type TanaTxApi = Readonly<{
  applySupertag: (
    input: Readonly<{
      definition?: SupertagDefinition;
      nodeId: NodeId;
      tagId: NodeId;
    }>
  ) => void;
  createNode: (input?: TanaCreateNodeInput) => NodeId;
  createPlacement: (input: TanaCreatePlacementInput) => PlacementId;
  deleteNode: (input: TanaDeleteNodeInput) => void;
  deletePlacement: (input: TanaDeletePlacementInput) => void;
  indentPlacement: (input: Readonly<{ at: Path | NodeSelection }>) => void;
  insertReference: (input: TanaInsertReferenceInput) => void;
  mergeBackward: (input: TanaMergeBackwardInput) => boolean;
  removeReference: (input: TanaRemoveReferenceInput) => void;
  removeSupertag: (input: Readonly<{ nodeId: NodeId; tagId: NodeId }>) => void;
  outdentPlacement: (input: Readonly<{ at: Path | NodeSelection }>) => void;
  setField: (
    input: Readonly<{
      fieldId: string;
      nodeId: NodeId;
      value: FieldValue;
    }>
  ) => void;
  splitNode: (input: TanaSplitNodeInput) => NodeId | null;
  movePlacement: (
    input: Readonly<{
      at: Path | NodeSelection;
      intent: OutlinerDropIntent;
      target: Path;
    }>
  ) => void;
}>;

type TanaTransaction = EditorUpdateTransaction<
  TanaValue,
  readonly [OutlinerExtension, typeof TanaSchema]
>;

const documentOf = (tx: TanaTransaction): TanaDocument => tx.value();

const nodeAtRoot = (
  tx: TanaTransaction,
  nodeId: NodeId
): NodeElement | undefined => {
  const node = documentOf(tx).roots?.[nodeRoot(nodeId)]?.[0];
  return isNodeElement(node) ? node : undefined;
};

const appendRecord = (
  tx: TanaTransaction,
  record: ReturnType<typeof createNodeWithPlacement>['record']
) => {
  const catalog = tx.value().roots?.[TANA_NODE_CATALOG_ROOT] ?? [];
  tx.roots.replace(TANA_NODE_CATALOG_ROOT, [...catalog, record]);
};

const updateNodeMetadata = (
  tx: TanaTransaction,
  nodeId: NodeId,
  update: (node: NodeElement) => NodeElement['metadata']
) => {
  const root = nodeRoot(nodeId);
  const node = nodeAtRoot(tx, nodeId);
  if (!node) {
    throw new Error(`Unknown Tana Node "${nodeId}".`);
  }
  tx.nodes.set(
    { metadata: update(node) },
    { at: SelectionApi.nodes([[0]], { root }) }
  );
};

const relationError = (nodeId: NodeId, relation: string) =>
  new Error(`Cannot delete Node "${nodeId}": ${relation} still exists.`);

const createTanaUpdate = (
  tx: TanaTransaction & Readonly<{ outliner: OutlinerTxApi }>
): TanaTxApi => ({
  applySupertag({ definition, nodeId, tagId }) {
    updateNodeMetadata(
      tx,
      nodeId,
      (node) => withSupertag(node, tagId, definition).metadata
    );
  },
  createNode({ at, metadata = {}, parent, text = '' } = {}) {
    const created = createNodeWithPlacement(text);
    const node = { ...created.node, metadata };
    tx.roots.create(created.root, [node]);
    appendRecord(tx, created.record);
    tx.nodes.insert(created.placement, {
      at:
        at ??
        (parent
          ? [...parent, tx.nodes.children(parent).length]
          : [tx.children().length]),
    });
    return created.nodeId;
  },
  createPlacement({ at, nodeId }) {
    if (!nodeAtRoot(tx, nodeId)) {
      throw new Error(`Unknown Tana Node "${nodeId}".`);
    }
    const placement = createPlacement(nodeId);
    tx.nodes.insert(placement, { at });
    return placement.placementId;
  },
  deleteNode({ nodeId }) {
    const index = buildTanaIndex(documentOf(tx));
    if (!index.nodes.has(nodeId)) {
      throw new Error(`Unknown Tana Node "${nodeId}".`);
    }
    if ((index.placementsByNode.get(nodeId) ?? []).length > 0) {
      throw relationError(nodeId, 'a Placement');
    }
    if ((index.backlinks.get(nodeId) ?? []).length > 0) {
      throw relationError(nodeId, 'a Reference');
    }
    for (const node of index.nodes.values()) {
      const values = Object.values(node.metadata.fields ?? {});
      if (
        values.some(
          (value) =>
            value === nodeId || (Array.isArray(value) && value.includes(nodeId))
        )
      ) {
        throw relationError(nodeId, 'a field reference');
      }
      if ((node.metadata.supertags ?? []).includes(nodeId)) {
        throw relationError(nodeId, 'a Supertag relation');
      }
      if (node.metadata.supertagDefinition?.extends?.includes(nodeId)) {
        throw relationError(nodeId, 'a Supertag inheritance relation');
      }
    }
    const catalog = (tx.value().roots?.[TANA_NODE_CATALOG_ROOT] ?? []).filter(
      (record) => !('nodeId' in record) || record.nodeId !== nodeId
    );
    tx.roots.replace(TANA_NODE_CATALOG_ROOT, catalog);
    tx.roots.delete(nodeRoot(nodeId));
  },
  deletePlacement({ at }) {
    tx.nodes.remove({ at });
  },
  indentPlacement({ at }) {
    tx.outliner.nest({ at });
  },
  insertReference({ alias, at, sourceNodeId, targetNodeId }) {
    if (!nodeAtRoot(tx, sourceNodeId) || !nodeAtRoot(tx, targetNodeId)) {
      throw new Error('Reference source and target Nodes must exist.');
    }
    const reference = createReference(targetNodeId, alias);
    tx.nodes.insert(reference, {
      at,
    });
  },
  mergeBackward({ at, nodeId }) {
    if (!PathApi.hasPrevious(at)) return false;
    const previous = tx.nodes.get(PathApi.previous(at))?.[0];
    if (!isPlacement(previous)) return false;
    const merged = tx.outliner.mergeBackward({
      at,
      childType: 'placement',
      sourceRoot: nodeRoot(nodeId),
      targetRoot: nodeRoot(previous.nodeId),
    });
    return merged;
  },
  movePlacement({ at, intent, target }) {
    tx.outliner.move({ at, intent, target });
  },
  removeReference({ at, sourceNodeId }) {
    tx.nodes.remove({
      at: SelectionApi.nodes([at], { root: nodeRoot(sourceNodeId) }),
    });
  },
  removeSupertag({ nodeId, tagId }) {
    updateNodeMetadata(
      tx,
      nodeId,
      (node) => withoutSupertag(node, tagId).metadata
    );
  },
  outdentPlacement({ at }) {
    tx.outliner.unnest({ at });
  },
  setField({ fieldId, nodeId, value }) {
    updateNodeMetadata(
      tx,
      nodeId,
      (node) => withFieldValue(node, fieldId, value).metadata
    );
  },
  splitNode({ at, nodeId, range }) {
    const current = nodeAtRoot(tx, nodeId);
    if (!current) throw new Error(`Unknown Tana Node "${nodeId}".`);
    const created = createNodeWithPlacement();
    const metadata = current.metadata.supertags
      ? { supertags: current.metadata.supertags }
      : {};
    const split = tx.outliner.splitAtSelection({
      at,
      block: created.placement,
      range,
      sourceRoot: nodeRoot(nodeId),
      targetProperties: { metadata, nodeId: created.nodeId },
      targetRoot: created.root,
      type: 'node',
    });
    if (!split) return null;
    appendRecord(tx, created.record);
    return created.nodeId;
  },
});

export type TanaExtension = EditorExtension<{
  dependencies: readonly [
    EditorExtensionDependencyReferenceFor<OutlinerExtension>,
    EditorExtensionDependencyReferenceFor<typeof TanaSchema>,
  ];
  name: 'tana';
  update: TanaTxApi;
}>;

/** Install Tana domain transactions and their generic Outliner dependency. */
export function tana(outlinerExtension: OutlinerExtension): TanaExtension;
export function tana(outlinerExtension: OutlinerExtension): TanaExtension {
  return defineExtension('tana', {
    dependencies: [outlinerExtension, TanaSchema],
    update: ({ tx }) => createTanaUpdate(tx),
  });
}
