import {
  defineEditorSchema,
  type EditorDocumentValue,
  property,
  schema,
  type Text,
} from '@platejs/plite';

import type { FieldDefinition, FieldValues } from './field';

export type NodeId = string & { readonly __nodeId: unique symbol };
export type PlacementId = string & { readonly __placementId: unique symbol };

export type TanaText = Text;

export type PlacementAnchorElement = {
  type: 'placement-anchor';
  children: TanaText[];
};

export type ReferenceElement = {
  children: TanaText[];
  type: 'reference';
  label: string;
  targetNodeId: NodeId;
};

export type ParagraphElement = {
  type: 'paragraph';
  children: Array<TanaText | ReferenceElement>;
};

export type NodeMetadata = Readonly<{
  fieldDefinitions?: readonly FieldDefinition[];
  fields?: FieldValues;
  supertagDefinition?: SupertagDefinition;
  supertags?: readonly NodeId[];
}>;

export type NodeElement = {
  type: 'node';
  nodeId: NodeId;
  metadata: NodeMetadata;
  children: ParagraphElement[];
};

export type NodeRecordElement = {
  type: 'node-record';
  childRoots: { body: string };
  nodeId: NodeId;
  children: TanaText[];
};

export type PlacementElement = {
  type: 'placement';
  childRoots: { body: string };
  nodeId: NodeId;
  placementId: PlacementId;
  children: Array<PlacementAnchorElement | PlacementElement>;
};

export type TanaElement =
  | NodeElement
  | NodeRecordElement
  | ParagraphElement
  | PlacementAnchorElement
  | PlacementElement
  | ReferenceElement;
export type TanaValue = TanaElement[];
export type TanaDocument = EditorDocumentValue<TanaValue>;

export type SupertagDefinition = Readonly<{
  extends?: readonly NodeId[];
  fields: readonly FieldDefinition[];
  name: string;
  view?: 'cards' | 'list' | 'table';
}>;

const randomId = () => {
  const cryptoId = globalThis.crypto?.randomUUID?.();
  return (
    cryptoId ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
};

export const createNodeId = (): NodeId => `node:${randomId()}` as NodeId;
export const createPlacementId = (): PlacementId =>
  `placement:${randomId()}` as PlacementId;
export const nodeRoot = (nodeId: NodeId) => `${nodeId}:root`;
export const TANA_NODE_CATALOG_ROOT = 'tana:nodes' as const;

export const TanaSchema = defineEditorSchema('tana-schema', {
  elements: {
    node: {
      content: schema.content.type('paragraph', {
        default: { type: 'paragraph' },
        min: 1,
      }),
      properties: {
        metadata: property.json({ default: {} }),
        nodeId: property.string({ required: true }),
      },
    },
    'node-record': {
      content: schema.content.text({ default: 'text', min: 1 }),
      contentRoots: {
        body: {
          content: schema.content.type('node', { min: 1 }),
          ownership: 'shared',
        },
      },
      properties: {
        nodeId: property.string({ required: true }),
      },
      selectable: false,
    },
    paragraph: {
      content: schema.content.any(
        [schema.content.text(), schema.content.type('reference')],
        { default: 'text', min: 1 }
      ),
    },
    'placement-anchor': {
      content: schema.content.text({ default: 'text', min: 1 }),
      selectable: false,
    },
    placement: {
      inline: false,
      keyboardSelectable: true,
      selectable: true,
      content: schema.content.any(
        [
          schema.content.type('placement-anchor'),
          schema.content.type('placement'),
        ],
        { default: { type: 'placement-anchor' }, min: 1 }
      ),
      contentRoots: {
        body: {
          content: schema.content.type('node', { min: 1 }),
          ownership: 'shared',
        },
      },
      properties: {
        nodeId: property.string({ required: true }),
        placementId: property.string({ required: true }),
      },
    },
    reference: {
      properties: {
        label: property.string({ required: true }),
        targetNodeId: property.string({ required: true }),
      },
      void: 'markable-inline',
    },
  },
  root: schema.content.type('placement', { min: 0 }),
  roots: {
    [TANA_NODE_CATALOG_ROOT]: schema.content.type('node-record', { min: 0 }),
  },
  unknown: 'reject',
});

export const createNodeElement = (
  nodeId: NodeId,
  text = '',
  metadata: NodeMetadata = {}
): NodeElement => ({
  type: 'node',
  nodeId,
  metadata,
  children: [{ type: 'paragraph', children: [{ text }] }],
});

export const createPlacement = (
  nodeId: NodeId,
  children: PlacementElement[] = []
): PlacementElement => ({
  type: 'placement',
  childRoots: { body: nodeRoot(nodeId) },
  nodeId,
  placementId: createPlacementId(),
  children: [
    { type: 'placement-anchor', children: [{ text: '' }] },
    ...children,
  ],
});

export const createNodeRecord = (nodeId: NodeId): NodeRecordElement => ({
  type: 'node-record',
  childRoots: { body: nodeRoot(nodeId) },
  nodeId,
  children: [{ text: '' }],
});

export const createNodeWithPlacement = (text = '') => {
  const nodeId = createNodeId();
  return {
    node: createNodeElement(nodeId, text),
    nodeId,
    placement: createPlacement(nodeId),
    record: createNodeRecord(nodeId),
    root: nodeRoot(nodeId),
  };
};

export const createStarterDocument = (): TanaDocument => {
  const welcome = createNodeWithPlacement(
    'Local-first thinking, arranged clearly.'
  );
  const principles = createNodeWithPlacement('Principles');
  const shared = createNodeWithPlacement('One node can appear in many places.');
  const fields = createNodeWithPlacement(
    'Fields, references, and supertags stay close to the work.'
  );
  const today = createNodeWithPlacement('Today');
  const projectTagId = 'node:tag-project' as NodeId;
  const projectTag = {
    node: createNodeElement(projectTagId, 'Project'),
    nodeId: projectTagId,
    placement: createPlacement(projectTagId),
    record: createNodeRecord(projectTagId),
    root: nodeRoot(projectTagId),
  };
  projectTag.node.metadata = {
    supertagDefinition: {
      fields: [
        {
          defaultValue: 'Planned',
          id: 'status',
          label: 'Status',
          options: ['Planned', 'Active', 'Done'],
          type: 'select',
        },
        { id: 'due', label: 'Due date', type: 'date' },
        { id: 'estimate', label: 'Estimate', type: 'number' },
        {
          defaultValue: false,
          id: 'blocked',
          label: 'Blocked',
          type: 'boolean',
        },
        { id: 'owner', label: 'Owner', type: 'node-reference' },
        { id: 'note', label: 'Note', type: 'text' },
      ],
      name: 'Project',
      view: 'list',
    },
  };
  const sharedCopy: PlacementElement = {
    ...createPlacement(shared.nodeId),
  };

  principles.placement.children = [
    { type: 'placement-anchor', children: [{ text: '' }] },
    shared.placement,
    fields.placement,
    projectTag.placement,
  ];
  today.placement.children = [
    { type: 'placement-anchor', children: [{ text: '' }] },
    sharedCopy,
  ];

  return {
    children: [welcome.placement, principles.placement, today.placement],
    roots: {
      [TANA_NODE_CATALOG_ROOT]: [
        welcome.record,
        principles.record,
        shared.record,
        fields.record,
        today.record,
        projectTag.record,
      ],
      [welcome.root]: [welcome.node],
      [principles.root]: [principles.node],
      [shared.root]: [shared.node],
      [fields.root]: [fields.node],
      [today.root]: [today.node],
      [projectTag.root]: [projectTag.node],
    },
  };
};

export const ensureNodeCatalog = (document: TanaDocument): TanaDocument => {
  const roots = document.roots ?? {};
  const existing = (roots[TANA_NODE_CATALOG_ROOT] ?? []).filter(
    (value): value is NodeRecordElement =>
      typeof value === 'object' &&
      value !== null &&
      (value as { type?: unknown }).type === 'node-record'
  );
  const recorded = new Set(existing.map((record) => record.nodeId));
  const missing = Object.values(roots)
    .flatMap((value) => value)
    .filter(isNodeElement)
    .filter((node) => !recorded.has(node.nodeId))
    .map((node) => createNodeRecord(node.nodeId));

  if (roots[TANA_NODE_CATALOG_ROOT] && missing.length === 0) return document;

  return {
    ...document,
    roots: {
      ...roots,
      [TANA_NODE_CATALOG_ROOT]: [...existing, ...missing],
    },
  };
};

export const isPlacement = (value: unknown): value is PlacementElement =>
  typeof value === 'object' &&
  value !== null &&
  (value as { type?: unknown }).type === 'placement';

export const isNodeElement = (value: unknown): value is NodeElement =>
  typeof value === 'object' &&
  value !== null &&
  (value as { type?: unknown }).type === 'node';
