import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEditor, SelectionApi } from '@platejs/plite';
import { history } from '@platejs/plite-history';
import { outliner } from '@platejs/plite-outliner';

import {
  buildTanaIndex,
  createReference,
  createStarterDocument,
  FIELD_TYPES,
  nodeRoot,
  nodeText,
  normalizeFieldValue,
  resolveSupertagDefinition,
  tana,
  TanaSchema,
  type NodeId,
  type NodeElement,
  type PlacementElement,
  type SupertagDefinition,
} from '../src';

const createTanaEditor = () => createEditor({
  extensions: [history(), outliner(), tana(), TanaSchema],
  initialValue: createStarterDocument(),
});

describe('Tana canonical model and transactions', () => {
  it('keeps NodeId distinct from PlacementId and shares one node root', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const shared = [...index.placementsByNode].find(([, placements]) => placements.length > 1);
    assert.ok(shared);
    const [nodeId, placements] = shared;
    assert.ok(document.roots?.[nodeRoot(nodeId)]);
    for (const placementId of placements) {
      assert.notEqual(placementId, nodeId);
      assert.equal(index.placements.get(placementId)?.nodeId, nodeId);
    }
  });

  it('rebuilds backlinks, tags, fields, ancestors, and descendants', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const [source, target] = [...index.nodes.values()];
    assert.ok(source && target);
    source.children[0]?.children.push(createReference(target.nodeId, nodeText(target)));
    source.metadata = { fields: { priority: 3 }, supertags: ['node:tag-project' as NodeId] };
    const rebuilt = buildTanaIndex(document);
    assert.deepEqual(rebuilt.backlinks.get(target.nodeId), [source.nodeId]);
    assert.deepEqual(rebuilt.nodesBySupertag.get('node:tag-project' as NodeId), [source.nodeId]);
    assert.equal(rebuilt.fieldValues.get(source.nodeId)?.priority, 3);
    const nested = [...rebuilt.placements.values()].find((item) => item.ancestors.length > 0);
    assert.ok(nested);
    assert.ok(rebuilt.descendants.get(nested.ancestors[0]!)?.includes(nested.placementId));
  });

  it('supports field normalization and inherited supertag fields', () => {
    assert.deepEqual([...FIELD_TYPES].sort(), ['boolean', 'date', 'node-reference', 'number', 'select', 'text']);
    assert.equal(normalizeFieldValue({ id: 'n', label: 'N', type: 'number' }, '4.5'), 4.5);
    assert.deepEqual(normalizeFieldValue({ id: 'r', label: 'R', type: 'node-reference' }, 'node:a'), ['node:a']);
    const parent = 'node:parent' as NodeId;
    const child = 'node:child' as NodeId;
    const definitions = new Map<NodeId, SupertagDefinition>([
      [parent, { fields: [{ id: 'status', label: 'Status', type: 'select' }], name: 'Parent' }],
      [child, { extends: [parent], fields: [{ id: 'status', label: 'State', type: 'text' }, { id: 'due', label: 'Due', type: 'date' }], name: 'Child' }],
    ]);
    assert.deepEqual(resolveSupertagDefinition(child, definitions)?.fields.map((field) => [field.id, field.type]), [['status', 'text'], ['due', 'date']]);
  });

  it('splits a canonical node through one undoable transaction', () => {
    const editor = createTanaEditor();
    const placement = editor.read.children()[0] as PlacementElement;
    const root = nodeRoot(placement.nodeId);
    const point = { offset: 5, path: [0, 0, 0], root };
    const before = editor.read.value();
    editor.update((tx) => {
      tx.selection.set(SelectionApi.text({ anchor: point, focus: point }));
      tx.tana.splitNode({ at: [0], nodeId: placement.nodeId, range: SelectionApi.text({ anchor: point, focus: point }) });
    });
    assert.equal(editor.read.children().length, 4);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });

  it('merges canonical roots and preserves child placements', () => {
    const editor = createTanaEditor();
    const placement = editor.read.nodes.get([1, 2])?.[0] as PlacementElement;
    const before = editor.read.value();
    editor.update((tx) => tx.tana.mergeBackward({ at: [1, 2], nodeId: placement.nodeId }));
    assert.deepEqual(editor.read.nodes.get([1, 2])?.[0]?.type, 'placement');
    assert.deepEqual(editor.read.root(nodeRoot(placement.nodeId)), []);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });

  it('uses explicit Node deletion and never performs implicit garbage collection', () => {
    const editor = createTanaEditor();
    const first = editor.read.nodes.get([0])?.[0] as PlacementElement;
    assert.throws(() => editor.update((tx) => tx.tana.deleteNode({ nodeId: first.nodeId })), /Placement/);
    editor.update((tx) => tx.tana.deletePlacement({ at: [0] }));
    assert.ok(editor.read.root(nodeRoot(first.nodeId)).length > 0);
  });

  it('updates references and metadata through Tana transactions', () => {
    const editor = createTanaEditor();
    const source = editor.read.nodes.get([0])?.[0] as PlacementElement;
    const target = editor.read.nodes.get([1])?.[0] as PlacementElement;
    const sourceNode = editor.read.root(nodeRoot(source.nodeId))[0] as NodeElement;
    const point = { offset: nodeText(sourceNode).length, path: [0, 0, 0], root: nodeRoot(source.nodeId) };
    editor.update((tx) => tx.tana.insertReference({ at: point, label: 'Target', sourceNodeId: source.nodeId, targetNodeId: target.nodeId }));
    assert.deepEqual(buildTanaIndex(editor.read.value()).backlinks.get(target.nodeId), [source.nodeId]);
    editor.update((tx) => tx.tana.setField({ fieldId: 'priority', nodeId: source.nodeId, value: 3 }));
    assert.equal(buildTanaIndex(editor.read.value()).nodes.get(source.nodeId)?.metadata.fields?.priority, 3);
  });
});
