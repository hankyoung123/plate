import type { EditorDocumentValue, Path } from '@platejs/plite';

import {
  isNodeElement,
  isPlacement,
  type NodeElement,
  type NodeId,
  type PlacementElement,
  type PlacementId,
  type ReferenceElement,
  type TanaValue,
} from './model';

export type PlacementRecord = Readonly<{
  ancestors: readonly PlacementId[];
  nodeId: NodeId;
  parentId?: PlacementId;
  path: Path;
  placementId: PlacementId;
}>;

export type TanaIndex = Readonly<{
  ancestors: ReadonlyMap<PlacementId, readonly PlacementId[]>;
  backlinks: ReadonlyMap<NodeId, readonly NodeId[]>;
  children: ReadonlyMap<PlacementId | 'root', readonly PlacementId[]>;
  descendants: ReadonlyMap<PlacementId, readonly PlacementId[]>;
  fieldValues: ReadonlyMap<NodeId, NodeElement['metadata']['fields']>;
  nodes: ReadonlyMap<NodeId, NodeElement>;
  nodesBySupertag: ReadonlyMap<NodeId, readonly NodeId[]>;
  placements: ReadonlyMap<PlacementId, PlacementRecord>;
  placementsByNode: ReadonlyMap<NodeId, readonly PlacementId[]>;
}>;

const add = <K, V>(map: Map<K, V[]>, key: K, value: V) => {
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
};

const referencesIn = (node: NodeElement): NodeId[] => {
  const result: NodeId[] = [];
  const walk = (children: readonly unknown[]) => {
    for (const child of children) {
      if (typeof child !== 'object' || child === null) continue;
      if ((child as { type?: string }).type === 'reference') {
        result.push((child as ReferenceElement).targetNodeId);
      }
      const nested = (child as { children?: unknown }).children;
      if (Array.isArray(nested)) walk(nested);
    }
  };
  walk(node.children);
  return result;
};

/** Rebuild every query projection from the canonical Plite document. */
export const buildTanaIndex = (
  document: EditorDocumentValue<TanaValue>
): TanaIndex => {
  const nodes = new Map<NodeId, NodeElement>();
  for (const root of Object.values(document.roots ?? {})) {
    for (const item of root)
      {if (isNodeElement(item)) nodes.set(item.nodeId, item);}
  }

  const placements = new Map<PlacementId, PlacementRecord>();
  const placementsByNode = new Map<NodeId, PlacementId[]>();
  const children = new Map<PlacementId | 'root', PlacementId[]>();
  const ancestors = new Map<PlacementId, readonly PlacementId[]>();
  const descendants = new Map<PlacementId, PlacementId[]>();

  const visit = (
    placement: PlacementElement,
    path: Path,
    lineage: readonly PlacementId[],
    parentId?: PlacementId
  ) => {
    const record = {
      ancestors: lineage,
      nodeId: placement.nodeId,
      parentId,
      path,
      placementId: placement.placementId,
    } satisfies PlacementRecord;
    placements.set(placement.placementId, record);
    ancestors.set(placement.placementId, lineage);
    add(placementsByNode, placement.nodeId, placement.placementId);
    add(children, parentId ?? 'root', placement.placementId);
    for (const ancestor of lineage)
      {add(descendants, ancestor, placement.placementId);}
    placement.children.forEach((child, index) => {
      if (isPlacement(child)) {
        visit(
          child,
          [...path, index],
          [...lineage, placement.placementId],
          placement.placementId
        );
      }
    });
  };
  document.children.forEach((item, index) => {
    if (isPlacement(item)) visit(item, [index], []);
  });

  const backlinks = new Map<NodeId, NodeId[]>();
  const nodesBySupertag = new Map<NodeId, NodeId[]>();
  const fieldValues = new Map<NodeId, NodeElement['metadata']['fields']>();
  for (const node of nodes.values()) {
    for (const target of referencesIn(node))
      {add(backlinks, target, node.nodeId);}
    for (const tag of node.metadata.supertags ?? [])
      {add(nodesBySupertag, tag, node.nodeId);}
    fieldValues.set(node.nodeId, node.metadata.fields);
  }

  return {
    ancestors,
    backlinks,
    children,
    descendants,
    fieldValues,
    nodes,
    nodesBySupertag,
    placements,
    placementsByNode,
  };
};

export const nodeText = (node: NodeElement): string => {
  const collect = (value: unknown): string => {
    if (typeof value !== 'object' || value === null) return '';
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ((value as { type?: string }).type === 'reference') {
      return (value as ReferenceElement).label;
    }
    const {children} = (value as { children?: unknown });
    return Array.isArray(children) ? children.map(collect).join('') : '';
  };
  return node.children.map(collect).join('\n');
};

const buildNodeOnlyIndex = (
  document: EditorDocumentValue<TanaValue>,
  structural: TanaIndex
): TanaIndex => {
  const fresh = buildTanaIndex(document);
  return {
    ancestors: structural.ancestors,
    backlinks: fresh.backlinks,
    children: structural.children,
    descendants: structural.descendants,
    fieldValues: fresh.fieldValues,
    nodes: fresh.nodes,
    nodesBySupertag: fresh.nodesBySupertag,
    placements: structural.placements,
    placementsByNode: structural.placementsByNode,
  };
};

/** Commit-driven derived-index owner; structural maps survive node-only edits. */
export class TanaIndexStore {
  private document: EditorDocumentValue<TanaValue>;
  private value: TanaIndex;

  constructor(document: EditorDocumentValue<TanaValue>) {
    this.document = document;
    this.value = buildTanaIndex(document);
  }

  get current(): TanaIndex {
    return this.value;
  }

  rebuild(document: EditorDocumentValue<TanaValue>): TanaIndex {
    this.document = document;
    this.value = buildTanaIndex(document);
    return this.value;
  }

  update(document: EditorDocumentValue<TanaValue>): TanaIndex {
    this.value =
      this.document.children === document.children
        ? buildNodeOnlyIndex(document, this.value)
        : buildTanaIndex(document);
    this.document = document;
    return this.value;
  }
}
