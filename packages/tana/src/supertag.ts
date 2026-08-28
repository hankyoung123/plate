import { createEditorView, type Editor } from '@platejs/plite';

import {
  type NodeElement,
  type NodeId,
  nodeRoot,
  type SupertagDefinition,
} from './model';

const updateNode = (
  editor: Editor,
  nodeId: NodeId,
  update: (node: NodeElement) => Partial<NodeElement>
) => {
  const view = createEditorView(editor, { root: nodeRoot(nodeId) });
  view.update((tx) => {
    const entry = tx.nodes.get([0], { type: 'node' });
    if (!entry) return;
    tx.nodes.set(update(entry[0] as NodeElement), { at: [0] });
  });
};

export const withSupertag = (
  node: NodeElement,
  tagId: NodeId,
  definition?: SupertagDefinition
): NodeElement => {
  const tags = [...new Set([...(node.metadata.supertags ?? []), tagId])];
  const defaults = Object.fromEntries(
    (definition?.fields ?? [])
      .filter((field) => field.defaultValue !== undefined)
      .map((field) => [field.id, field.defaultValue])
  ) as import('./field').FieldValues;

  return {
    ...node,
    metadata: {
      ...node.metadata,
      fields: { ...defaults, ...node.metadata.fields },
      supertags: tags,
    },
  };
};

export const withoutSupertag = (
  node: NodeElement,
  tagId: NodeId
): NodeElement => ({
  ...node,
  metadata: {
    ...node.metadata,
    supertags: (node.metadata.supertags ?? []).filter((id) => id !== tagId),
  },
});

export const withFieldValue = (
  node: NodeElement,
  fieldId: string,
  value: import('./field').FieldValue
): NodeElement => ({
  ...node,
  metadata: {
    ...node.metadata,
    fields: { ...node.metadata.fields, [fieldId]: value },
  },
});

export const applySupertag = (
  editor: Editor,
  nodeId: NodeId,
  tagId: NodeId,
  definition?: SupertagDefinition
) => {
  updateNode(editor, nodeId, (node) => ({
    metadata: withSupertag(node, tagId, definition).metadata,
  }));
};

export const removeSupertag = (editor: Editor, nodeId: NodeId, tagId: NodeId) =>
  updateNode(editor, nodeId, (node) => ({
    metadata: withoutSupertag(node, tagId).metadata,
  }));

export const setFieldValue = (
  editor: Editor,
  nodeId: NodeId,
  fieldId: string,
  value: import('./field').FieldValue
) =>
  updateNode(editor, nodeId, (node) => ({
    metadata: withFieldValue(node, fieldId, value).metadata,
  }));

/** Resolve inherited supertag fields with child definitions winning by id. */
export const resolveSupertagDefinition = (
  tagId: NodeId,
  definitions: ReadonlyMap<NodeId, SupertagDefinition>,
  visiting: ReadonlySet<NodeId> = new Set()
): SupertagDefinition | undefined => {
  const definition = definitions.get(tagId);
  if (!definition || visiting.has(tagId)) return definition;
  const nextVisiting = new Set(visiting).add(tagId);
  const inherited = (definition.extends ?? []).flatMap(
    (parent) =>
      resolveSupertagDefinition(parent, definitions, nextVisiting)?.fields ?? []
  );
  const fields = new Map(inherited.map((field) => [field.id, field]));
  for (const field of definition.fields) fields.set(field.id, field);
  return { ...definition, fields: [...fields.values()] };
};
