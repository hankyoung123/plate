import { type NodeId, type ReferenceElement } from './model';

export const createReference = (
  targetNodeId: NodeId,
  label: string
): ReferenceElement => ({
  type: 'reference',
  label,
  targetNodeId,
  children: [{ text: '' }],
});
