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
  isNodeElement,
  isPlacement,
  nodeRoot,
  nodeText,
  normalizeFieldValue,
  resolveSupertagDefinition,
  tana,
  TanaSchema,
  type NodeId,
  type NodeMetadata,
  type SupertagDefinition,
} from '../src';

const createTanaEditor = () => {
  const outlinerExtension = outliner();
  return createEditor({
    extensions: [
      history(),
      outlinerExtension,
      TanaSchema,
      tana(outlinerExtension),
    ],
    initialValue: createStarterDocument(),
  });
};

const placementAt = (
  editor: ReturnType<typeof createTanaEditor>,
  path: number[]
) => {
  const node = editor.read.nodes.get(path)?.[0];
  assert.ok(isPlacement(node));
  return node;
};

const createUnplacedNode = (
  editor: ReturnType<typeof createTanaEditor>,
  metadata?: NodeMetadata
) => {
  let nodeId: NodeId | undefined;
  editor.update((tx) => {
    nodeId = tx.tana.createNode({ at: [0], metadata });
  });
  assert.ok(nodeId);
  editor.update((tx) => tx.tana.deletePlacement({ at: [0] }));
  return nodeId;
};

describe('Tana canonical model and transactions', () => {
  it('keeps Node identity separate from every Placement occurrence', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const shared = [...index.placementsByNode].find(
      ([, placements]) => placements.length > 1
    );
    assert.ok(shared);
    const [nodeId, placements] = shared;
    assert.ok(document.roots?.[nodeRoot(nodeId)]);
    for (const placementId of placements) {
      assert.notEqual(placementId, nodeId);
      assert.equal(index.placements.get(placementId)?.nodeId, nodeId);
    }
  });

  it('merges one shared Placement without deleting its Node or other Placements', () => {
    const editor = createTanaEditor();
    const index = buildTanaIndex(editor.read.value());
    const shared = [...index.placementsByNode].find(
      ([, placements]) => placements.length > 1
    );
    assert.ok(shared);
    const [nodeId, beforePlacements] = shared;
    editor.update((tx) => tx.tana.createPlacement({ at: [1], nodeId }));
    const source = placementAt(editor, [1]);
    assert.equal(source.nodeId, nodeId);

    editor.update((tx) =>
      tx.tana.mergeBackward({ at: [1], nodeId: source.nodeId })
    );

    const after = buildTanaIndex(editor.read.value());
    assert.ok(editor.read.root(nodeRoot(nodeId)).length > 0);
    assert.deepEqual(after.placementsByNode.get(nodeId), beforePlacements);
  });

  it('deletes Nodes only explicitly and validates every domain relation', () => {
    const editor = createTanaEditor();
    const first = placementAt(editor, [0]);
    assert.throws(
      () => editor.update((tx) => tx.tana.deleteNode({ nodeId: first.nodeId })),
      /Placement/
    );
    editor.update((tx) => tx.tana.deletePlacement({ at: [0] }));
    assert.ok(editor.read.root(nodeRoot(first.nodeId)).length > 0);

    let targetId: NodeId | undefined;
    editor.update((tx) => {
      targetId = tx.tana.createNode({ at: [0], text: 'Target' });
    });
    assert.ok(targetId);
    const target = placementAt(editor, [0]);
    const source = placementAt(editor, [1]);
    editor.update((tx) => {
      tx.tana.deletePlacement({ at: [0] });
      const sourceNode = editor.read.root(nodeRoot(source.nodeId))[0];
      assert.ok(isNodeElement(sourceNode));
      const point = tx.points.end(tx.key(sourceNode));
      assert.ok(point);
      tx.tana.insertReference({
        at: point,
        sourceNodeId: source.nodeId,
        targetNodeId: target.nodeId,
      });
    });
    assert.throws(
      () =>
        editor.update((tx) => tx.tana.deleteNode({ nodeId: target.nodeId })),
      /Reference/
    );

    const fieldEditor = createTanaEditor();
    const fieldTarget = createUnplacedNode(fieldEditor);
    const fieldSource = placementAt(fieldEditor, [0]);
    fieldEditor.update((tx) =>
      tx.tana.setField({
        fieldId: 'relation',
        nodeId: fieldSource.nodeId,
        value: fieldTarget,
      })
    );
    assert.throws(
      () =>
        fieldEditor.update((tx) => tx.tana.deleteNode({ nodeId: fieldTarget })),
      /field reference/
    );

    const supertagEditor = createTanaEditor();
    const tagTarget = createUnplacedNode(supertagEditor);
    const tagged = placementAt(supertagEditor, [0]);
    supertagEditor.update((tx) =>
      tx.tana.applySupertag({ nodeId: tagged.nodeId, tagId: tagTarget })
    );
    assert.throws(
      () =>
        supertagEditor.update((tx) =>
          tx.tana.deleteNode({ nodeId: tagTarget })
        ),
      /Supertag relation/
    );

    const inheritanceEditor = createTanaEditor();
    const parentTag = createUnplacedNode(inheritanceEditor);
    createUnplacedNode(inheritanceEditor, {
      supertagDefinition: {
        extends: [parentTag],
        fields: [],
        name: 'Child tag',
      },
    });
    assert.throws(
      () =>
        inheritanceEditor.update((tx) =>
          tx.tana.deleteNode({ nodeId: parentTag })
        ),
      /Supertag inheritance relation/
    );

    const deletableEditor = createTanaEditor();
    const deletable = createUnplacedNode(deletableEditor);
    deletableEditor.update((tx) => tx.tana.deleteNode({ nodeId: deletable }));
    assert.equal(deletableEditor.read.root(nodeRoot(deletable)).length, 0);
  });

  it('deletes an exact multi-selection without deleting canonical Nodes', () => {
    const editor = createTanaEditor();
    const selected = [placementAt(editor, [0]), placementAt(editor, [1])];
    editor.update((tx) =>
      tx.tana.deletePlacement({ at: SelectionApi.nodes([[0], [1]]) })
    );

    assert.equal(editor.read.children().length, 1);
    for (const placement of selected) {
      assert.ok(editor.read.root(nodeRoot(placement.nodeId)).length > 0);
    }
  });

  it('projects canonical Reference titles after rename and honors aliases', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const [source, target] = [...index.nodes.values()];
    assert.ok(source && target);
    source.children[0]?.children.push(createReference(target.nodeId));
    let rebuilt = buildTanaIndex(document);
    assert.ok(nodeText(source, rebuilt.nodes).includes(nodeText(target)));

    target.children[0] = {
      type: 'paragraph',
      children: [{ text: 'Renamed canonical title' }],
    };
    rebuilt = buildTanaIndex(document);
    assert.ok(
      nodeText(source, rebuilt.nodes).includes('Renamed canonical title')
    );

    source.children[0]?.children.splice(
      -1,
      1,
      createReference(target.nodeId, 'Explicit alias')
    );
    assert.ok(nodeText(source, rebuilt.nodes).includes('Explicit alias'));
  });

  it('shares root edits and history across every Placement projection', () => {
    const editor = createTanaEditor();
    const before = buildTanaIndex(editor.read.value());
    const shared = [...before.placementsByNode].find(
      ([, placements]) => placements.length > 1
    );
    assert.ok(shared);
    const [nodeId, placements] = shared;
    const node = editor.read.root(nodeRoot(nodeId))[0];
    assert.ok(isNodeElement(node));
    const point = editor.read.points.end(editor.key(node));
    assert.ok(point);

    editor.update((tx) => tx.text.insert(' updated', { at: point }));
    const changed = buildTanaIndex(editor.read.value());
    assert.equal(
      changed.placementsByNode.get(nodeId)?.length,
      placements.length
    );
    assert.match(nodeText(changed.nodes.get(nodeId)!), /updated/);
    assert.equal(editor.read.history.undos().length, 1);

    editor.update.history.undo();
    assert.doesNotMatch(
      nodeText(buildTanaIndex(editor.read.value()).nodes.get(nodeId)!),
      /updated/
    );
    editor.update.history.redo();
    assert.match(
      nodeText(buildTanaIndex(editor.read.value()).nodes.get(nodeId)!),
      /updated/
    );
  });

  it('splits at a root-local range and restores the full document on undo', () => {
    const editor = createTanaEditor();
    const placement = placementAt(editor, [0]);
    const root = nodeRoot(placement.nodeId);
    const point = { offset: 5, path: [0, 0, 0], root };
    const range = SelectionApi.text({ anchor: point, focus: point });
    const before = editor.read.value();
    editor.update((tx) =>
      tx.tana.splitNode({ at: [0], nodeId: placement.nodeId, range })
    );
    assert.equal(editor.read.children().length, 4);
    assert.equal(editor.read.history.undos().length, 1);
    editor.update.history.undo();
    assert.deepEqual(editor.read.value(), before);
  });

  it('rebuilds backlinks, fields, supertags, ancestry, and inheritance', () => {
    const document = createStarterDocument();
    const index = buildTanaIndex(document);
    const [source, target] = [...index.nodes.values()];
    assert.ok(source && target);
    source.children[0]?.children.push(createReference(target.nodeId));
    source.metadata = {
      fields: { priority: 3 },
      supertags: ['node:tag-project' as NodeId],
    };
    const rebuilt = buildTanaIndex(document);
    assert.deepEqual(rebuilt.backlinks.get(target.nodeId), [source.nodeId]);
    assert.equal(rebuilt.fieldValues.get(source.nodeId)?.priority, 3);
    assert.ok(
      [...rebuilt.ancestors.values()].some((value) => value.length > 0)
    );

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
          fields: [{ id: 'status', label: 'State', type: 'text' }],
          name: 'Child',
        },
      ],
    ]);
    assert.equal(
      resolveSupertagDefinition(child, definitions)?.fields[0]?.type,
      'text'
    );
  });
});
