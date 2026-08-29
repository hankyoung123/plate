import type { NodeId, ReferenceElement } from './model';

export const createReference = (
  targetNodeId: NodeId,
  alias?: string
): ReferenceElement => ({
  ...(alias ? { alias } : {}),
  children: [{ text: '' }],
  targetNodeId,
  type: 'reference',
});
