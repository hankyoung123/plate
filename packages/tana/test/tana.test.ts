import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createEditor, SelectionApi } from '@platejs/plite';
import { history } from '@platejs/plite-history';
import { outliner } from '@platejs/plite-outliner';

import {
  buildTanaIndex,
  commitEmoji,
  commitNewChild,
  commitReference,
  commitSupertag,
  createReference,
  createStarterDocument,
  FIELD_TYPES,
  normalizeFieldValue,
  mergePlacementBackward,
  nodeRoot,
  nodeText,
  removePlacements,
  resolveSupertagDefinition,
  splitPlacementAtSelection,
  TanaSchema,
  type NodeId,
  type NodeElement,
  type PlacementElement,
  type SupertagDefinition,
} from '../src';

describe('Tana canonical model and projections', () => {
  it('keeps NodeId distinct from PlacementId and shares one node root', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const shared = [...index.placementsByNode].find(
      ([, placements]) => placements.length > 1
    );
    assert.ok(shared);
    const [nodeId, placements] = shared;
    assert.equal(placements.length, 2);
    assert.ok(document.roots?.[nodeRoot(nodeId)]);
    for (const placementId of placements) {
      assert.notEqual(placementId, nodeId);
      assert.equal(index.placements.get(placementId)?.nodeId, nodeId);
    }
  });

  it('rebuilds backlinks, tags, fields, ancestors, and descendants from the document', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const [source, target] = [...index.nodes.values()];
    assert.ok(source && target);
    source.children[0]?.children.push(
      createReference(target.nodeId, nodeText(target))
    );
    source.metadata = {
      fields: { priority: 3 },
      supertags: ['node:tag-project' as NodeId],
    };
    const rebuilt = buildTanaIndex(document);
    assert.deepEqual(rebuilt.backlinks.get(target.nodeId), [source.nodeId]);
    assert.deepEqual(
      rebuilt.nodesBySupertag.get('node:tag-project' as NodeId),
      [source.nodeId]
    );
    assert.equal(rebuilt.fieldValues.get(source.nodeId)?.priority, 3);
    const nested = [...rebuilt.placements.values()].find(
      (item) => item.ancestors.length > 0
    );
    assert.ok(nested);
    assert.ok(
      rebuilt.descendants
        .get(nested.ancestors[0]!)
        ?.includes(nested.placementId)
    );
  });

  it('supports every field kind and merges inherited tag fields by id', () => {
    assert.deepEqual([...FIELD_TYPES].sort(), [
      'boolean',
      'date',
      'node-reference',
      'number',
      'select',
      'text',
    ]);
    assert.equal(
      normalizeFieldValue({ id: 'n', label: 'N', type: 'number' }, '4.5'),
      4.5
    );
    assert.deepEqual(
      normalizeFieldValue(
        { id: 'r', label: 'R', type: 'node-reference' },
        'node:a'
      ),
      ['node:a']
    );
    const parent = 'node:parent' as NodeId;
    const child = 'node:child' as NodeId;
    const definitions = new Map<NodeId, SupertagDefinition>([
      [
        parent,
        {
          fields: [{ id: 'status', label: 'Status', type: 'select' }],
          name: 'Parent',
        },
      ],
      [
        child,
        {
          extends: [parent],
          fields: [
            { id: 'status', label: 'State', type: 'text' },
            { id: 'due', label: 'Due', type: 'date' },
          ],
          name: 'Child',
        },
      ],
    ]);
    const resolved = resolveSupertagDefinition(child, definitions);
    assert.deepEqual(
      resolved?.fields.map((field) => [field.id, field.type]),
      [
        ['status', 'text'],
        ['due', 'date'],
      ]
    );
  });

  it('splits content and placement as one undoable history batch', () => {
    const initial = createStarterDocument();
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const placement = editor.read.children()[0] as PlacementElement;
    const root = nodeRoot(placement.nodeId);
    const point = { offset: 5, path: [0, 0, 0], root };
    const before = editor.read.value();
    splitPlacementAtSelection(
      editor,
      [0],
      placement.nodeId,
      SelectionApi.text({ anchor: point, focus: point })
    );
    assert.equal(editor.read.children().length, 4);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });

  it('merges backward across canonical roots in one undoable batch', () => {
    const initial = createStarterDocument();
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const placement = editor.read.nodes.get([1, 2])?.[0] as PlacementElement;
    const before = editor.read.value();
    assert.equal(mergePlacementBackward(editor, [1, 2], placement), true);
    assert.equal(editor.read.nodes.get([1, 2])?.[0]?.type, 'placement');
    assert.deepEqual(editor.read.root(nodeRoot(placement.nodeId)), []);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });

  it('commits inline references and supertags with trigger deletion as one action', () => {
    const initial = createStarterDocument();
    const placement = initial.children[0] as PlacementElement;
    const root = nodeRoot(placement.nodeId);
    const node = initial.roots?.[root]?.[0] as NodeElement;
    const text = node.children[0]!.children[0]!;
    assert.ok('text' in text);
    text.text += ' #Project';
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const point = { offset: text.text.length, path: [0, 0, 0], root };
    editor.update((tx) =>
      tx.selection.set(SelectionApi.text({ anchor: point, focus: point }))
    );
    const tagId = 'node:tag-project' as NodeId;
    const definition =
      buildTanaIndex(initial).nodes.get(tagId)?.metadata.supertagDefinition;
    assert.equal(
      commitSupertag(editor, placement.nodeId, tagId, definition, 8),
      true
    );
    let indexed = buildTanaIndex(editor.read.value());
    assert.equal(
      nodeText(indexed.nodes.get(placement.nodeId)!).includes('#Project'),
      false
    );
    assert.deepEqual(indexed.nodes.get(placement.nodeId)?.metadata.supertags, [
      tagId,
    ]);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    indexed = buildTanaIndex(editor.read.value());
    assert.equal(
      nodeText(indexed.nodes.get(placement.nodeId)!).endsWith('#Project'),
      true
    );

    const referenceInitial = createStarterDocument();
    const referencePlacement = referenceInitial.children[0] as PlacementElement;
    const referenceRoot = nodeRoot(referencePlacement.nodeId);
    const referenceNode = referenceInitial.roots?.[
      referenceRoot
    ]?.[0] as NodeElement;
    const referenceText = referenceNode.children[0]!.children[0]!;
    assert.ok('text' in referenceText);
    referenceText.text += ' @target';
    const target = [...buildTanaIndex(referenceInitial).nodes.keys()].find(
      (id) => id !== referencePlacement.nodeId
    )!;
    const withReferenceTrigger = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: referenceInitial,
    });
    const referencePoint = {
      offset: referenceText.text.length,
      path: [0, 0, 0],
      root: referenceRoot,
    };
    withReferenceTrigger.update((tx) =>
      tx.selection.set(
        SelectionApi.text({ anchor: referencePoint, focus: referencePoint })
      )
    );
    assert.equal(
      commitReference(
        withReferenceTrigger,
        referencePlacement.nodeId,
        target,
        'Target',
        8
      ),
      true
    );
    assert.deepEqual(
      buildTanaIndex(withReferenceTrigger.read.value()).backlinks.get(target),
      [referencePlacement.nodeId]
    );
    assert.equal(withReferenceTrigger.read.history.undos().length, 1);
  });

  it('creates a slash-command child and consumes the trigger atomically', () => {
    const initial = createStarterDocument();
    const placement = initial.children[0] as PlacementElement;
    const root = nodeRoot(placement.nodeId);
    const node = initial.roots?.[root]?.[0] as NodeElement;
    const text = node.children[0]!.children[0]!;
    assert.ok('text' in text);
    text.text += ' /child';
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const point = { offset: text.text.length, path: [0, 0, 0], root };
    editor.update((tx) =>
      tx.selection.set(SelectionApi.text({ anchor: point, focus: point }))
    );
    assert.equal(commitNewChild(editor, [0], placement.nodeId, 6), true);
    const updated = buildTanaIndex(editor.read.value());
    assert.equal(updated.children.get(placement.placementId)?.length, 1);
    assert.equal(
      nodeText(updated.nodes.get(placement.nodeId)!).includes('/child'),
      false
    );
    assert.equal(editor.read.history.undos().length, 1);
  });

  it('commits emoji text and consumes its trigger in one undo unit', () => {
    const initial = createStarterDocument();
    const placement = initial.children[0] as PlacementElement;
    const root = nodeRoot(placement.nodeId);
    const node = initial.roots?.[root]?.[0] as NodeElement;
    const text = node.children[0]!.children[0]!;
    assert.ok('text' in text);
    text.text += ' :smile';
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const point = { offset: text.text.length, path: [0, 0, 0], root };
    editor.update((tx) =>
      tx.selection.set(SelectionApi.text({ anchor: point, focus: point }))
    );
    assert.equal(commitEmoji(editor, placement.nodeId, '😀', 6), true);
    assert.equal(
      nodeText(
        buildTanaIndex(editor.read.value()).nodes.get(placement.nodeId)!
      ),
      'Local-first thinking, arranged clearly. 😀'
    );
    assert.equal(editor.read.history.undos().length, 1);
  });

  it('removes placements without conflating them with canonical nodes', () => {
    const initial = createStarterDocument();
    const editor = createEditor({
      extensions: [history(), outliner(), TanaSchema],
      initialValue: initial,
    });
    const before = editor.read.value();
    const first = editor.read.nodes.get([0])?.[0] as PlacementElement;
    const shared = editor.read.nodes.get([1, 1])?.[0] as PlacementElement;
    const beforeFirstRoot = editor.read.root(nodeRoot(first.nodeId));
    const beforeSharedRoot = editor.read.root(nodeRoot(shared.nodeId));
    removePlacements(editor, [[0], [1, 1]]);
    assert.equal(editor.read.nodes.get([0])?.[0]?.type, 'placement');
    assert.deepEqual(editor.read.root(nodeRoot(first.nodeId)), beforeFirstRoot);
    assert.deepEqual(
      editor.read.root(nodeRoot(shared.nodeId)),
      beforeSharedRoot
    );
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });
});
