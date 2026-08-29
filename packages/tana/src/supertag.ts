import type { NodeElement, NodeId, SupertagDefinition } from './model';

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
