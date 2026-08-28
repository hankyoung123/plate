import { createEditorView, type Editor, type Path } from '@platejs/plite';

import { type NodeId, nodeRoot, type ReferenceElement } from './model';

export const createReference = (
  targetNodeId: NodeId,
  label: string
): ReferenceElement => ({
  type: 'reference',
  label,
  targetNodeId,
  children: [{ text: '' }],
});

export const insertReference = (
  editor: Editor,
  sourceNodeId: NodeId,
  reference: ReferenceElement,
  at?: Path
) => {
  const view = createEditorView(editor, { root: nodeRoot(sourceNodeId) });
  view.update((tx) => tx.nodes.insert(reference, at ? { at } : undefined));
};
