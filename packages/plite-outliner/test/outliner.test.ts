import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createEditor,
  defineEditorSchema,
  NodeApi,
  schema,
  SelectionApi,
} from '@platejs/plite';

import { outliner } from '../src';

const anchor = (text: string) => ({ type: 'anchor', children: [{ text }] });
const block = (text: string, children: unknown[] = [anchor(text)]) => ({
  type: 'block',
  children,
});

const OutlinerSchema = defineEditorSchema('outliner-test', {
  elements: {
    anchor: {
      content: schema.content.text({ default: 'text', min: 1 }),
      selectable: false,
    },
    block: {
      content: schema.content.any(
        [schema.content.type('anchor'), schema.content.type('block')],
        { default: { type: 'anchor' }, min: 1 }
      ),
      inline: false,
      keyboardSelectable: true,
      selectable: true,
    },
  },
  root: schema.content.type('block'),
});

const textAt = (editor: ReturnType<typeof createEditor>, path: number[]) => {
  const entry = editor.read.nodes.get(path);
  assert.ok(entry, JSON.stringify(editor.read.value()));
  return NodeApi.string(entry[0]);
};

describe('Plite outliner transactions', () => {
  it('inserts, nests, unnests, and preserves canonical node selection', () => {
    const editor = createEditor({
      extensions: [outliner(), OutlinerSchema],
      initialValue: [block('one'), block('two'), block('three')],
    });

    editor.update.outliner.insertSibling({ at: [0], block: block('inserted') });
    assert.equal(textAt(editor, [1]), 'inserted');

    editor.update.outliner.nest({ at: [1] });
    assert.equal(textAt(editor, [0, 1]), 'inserted');
    assert.deepEqual(
      editor.read.selection.nodes().map(([, path]) => path),
      [[0, 1]]
    );

    editor.update.outliner.unnest({ at: [0, 1] });
    assert.equal(textAt(editor, [1]), 'inserted');
    assert.deepEqual(
      editor.read.selection.nodes().map(([, path]) => path),
      [[1]]
    );
  });

  it('moves exact multi-selection and rejects subtree cycles', () => {
    const editor = createEditor({
      extensions: [outliner(), OutlinerSchema],
      initialValue: [block('a'), block('b'), block('c')],
    });
    const selection = SelectionApi.nodes([[0], [1]]);

    editor.update.outliner.move({
      at: selection,
      intent: 'after',
      target: [2],
    });
    assert.equal(editor.read.children().length, 3);

    const nested = createEditor({
      extensions: [outliner(), OutlinerSchema],
      initialValue: [block('', [anchor(''), block('child')])],
    });
    assert.throws(
      () =>
        nested.update.outliner.move({
          at: [0],
          intent: 'child',
          target: [0, 0],
        }),
      /subtree/
    );
  });

  it('supports before, after, and child intents across parents', () => {
    const editor = createEditor({
      extensions: [outliner(), OutlinerSchema],
      initialValue: [block('a'), block('b'), block('parent')],
    });

    editor.update.outliner.move({
      at: [0],
      intent: 'after',
      target: [1],
    });
    assert.deepEqual(
      editor.read.children().map((node) => NodeApi.string(node)),
      ['b', 'a', 'parent']
    );

    editor.update.outliner.move({
      at: [1],
      intent: 'child',
      target: [2],
    });
    assert.deepEqual(
      editor.read.children().map((node) => NodeApi.string(node)),
      ['b', 'parenta']
    );

    editor.update.outliner.move({
      at: [1, 1],
      intent: 'before',
      target: [0],
    });
    assert.deepEqual(
      editor.read.children().map((node) => NodeApi.string(node)),
      ['a', 'b', 'parent']
    );
  });
});
