import {
  createEditorView,
  type Editor,
  type EditorUpdateTransaction,
  type Path,
  type Range,
  SelectionApi,
} from '@platejs/plite';

import type { FieldValue } from './field';
import {
  createNodeWithPlacement,
  createPlacement,
  type NodeElement,
  type NodeId,
  nodeRoot,
  TANA_NODE_CATALOG_ROOT,
  type ReferenceElement,
  type SupertagDefinition,
  type TanaValue,
} from './model';
import { createReference } from './reference';
import { withFieldValue, withSupertag } from './supertag';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

type InlineEdit = Readonly<{
  node: NodeElement;
  point: { offset: number; path: Path; root: string };
}>;

const editTrigger = (
  editor: Editor,
  nodeId: NodeId,
  distance: number,
  insert?: ReferenceElement,
  selectionInput?: Range | null
): InlineEdit | null => {
  const root = nodeRoot(nodeId);
  const selection: Range | null =
    selectionInput ??
    createEditorView(editor, {
      root,
    }).read.selection();
  if (!selection) return null;

  const value = clone(editor.read.root(root) as TanaValue);
  const node = value[0] as NodeElement | undefined;
  const paragraphIndex = selection.focus.path[1] ?? 0;
  const childIndex = selection.focus.path[2] ?? 0;
  const paragraph = node?.children[paragraphIndex];
  const child = paragraph?.children[childIndex];
  if (!node || !paragraph || !child || !('text' in child)) return null;

  const { offset } = selection.focus;
  const start = Math.max(0, offset - distance);
  const before = { ...child, text: child.text.slice(0, start) };
  const after = { ...child, text: child.text.slice(offset) };
  const replacement = insert
    ? [before, insert, after]
    : [{ ...child, text: before.text + after.text }];
  const nextParagraph = {
    ...paragraph,
    children: [
      ...paragraph.children.slice(0, childIndex),
      ...replacement,
      ...paragraph.children.slice(childIndex + 1),
    ],
  };
  node.children = [
    ...node.children.slice(0, paragraphIndex),
    nextParagraph,
    ...node.children.slice(paragraphIndex + 1),
  ];
  const point = insert
    ? { offset: 0, path: [0, paragraphIndex, childIndex + 2], root }
    : { offset: start, path: [0, paragraphIndex, childIndex], root };

  return { node, point };
};

const selectPoint = (tx: EditorUpdateTransaction, point: InlineEdit['point']) =>
  tx.selection.set(SelectionApi.text({ anchor: point, focus: point }));

export const commitReference = (
  editor: Editor,
  nodeId: NodeId,
  targetNodeId: NodeId,
  label: string,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(
    editor,
    nodeId,
    triggerLength,
    createReference(targetNodeId, label),
    selection
  );
  if (!edit) return false;
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [edit.node]);
    selectPoint(tx, edit.point);
  });
  return true;
};

export const commitEmoji = (
  editor: Editor,
  nodeId: NodeId,
  emoji: string,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(editor, nodeId, triggerLength, undefined, selection);
  if (!edit) return false;
  const paragraphIndex = edit.point.path[1] ?? 0;
  const childIndex = edit.point.path[2] ?? 0;
  const child = edit.node.children[paragraphIndex]?.children[childIndex];
  if (!child || !('text' in child)) return false;
  edit.node.children[paragraphIndex]!.children[childIndex] = {
    ...child,
    text: `${child.text.slice(0, edit.point.offset)}${emoji}${child.text.slice(edit.point.offset)}`,
  };
  const point = { ...edit.point, offset: edit.point.offset + emoji.length };
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [edit.node]);
    selectPoint(tx, point);
  });
  return true;
};

export const commitSupertag = (
  editor: Editor,
  nodeId: NodeId,
  tagId: NodeId,
  definition: SupertagDefinition | undefined,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(editor, nodeId, triggerLength, undefined, selection);
  if (!edit) return false;
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [
      withSupertag(edit.node, tagId, definition),
    ]);
    selectPoint(tx, edit.point);
  });
  return true;
};

export const commitFieldValue = (
  editor: Editor,
  nodeId: NodeId,
  fieldId: string,
  value: FieldValue,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(editor, nodeId, triggerLength, undefined, selection);
  if (!edit) return false;
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [
      withFieldValue(edit.node, fieldId, value),
    ]);
    selectPoint(tx, edit.point);
  });
  return true;
};

export const commitNewChild = (
  editor: Editor,
  parent: Path,
  nodeId: NodeId,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(editor, nodeId, triggerLength, undefined, selection);
  if (!edit) return false;
  const created = createNodeWithPlacement();
  const catalog = editor.read.root(TANA_NODE_CATALOG_ROOT);
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [edit.node]);
    tx.roots.replace(TANA_NODE_CATALOG_ROOT, [...catalog, created.record]);
    tx.roots.create(created.root, [created.node]);
    tx.nodes.insert(created.placement, {
      at: [...parent, tx.nodes.children(parent).length],
    });
    selectPoint(tx, edit.point);
  });
  return true;
};

export const commitSharedPlacement = (
  editor: Editor,
  at: Path,
  nodeId: NodeId,
  triggerLength: number,
  selection?: Range | null
) => {
  const edit = editTrigger(editor, nodeId, triggerLength, undefined, selection);
  if (!edit) return false;
  editor.update((tx) => {
    tx.roots.replace(nodeRoot(nodeId), [edit.node]);
    tx.nodes.insert(createPlacement(nodeId), {
      at: [...at.slice(0, -1), (at.at(-1) ?? 0) + 1],
    });
    selectPoint(tx, edit.point);
  });
  return true;
};
