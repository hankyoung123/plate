import { RangeApi, type Point, type Range } from '@platejs/plite';
import { useEditor, useEditorSelection } from '@platejs/plite-react';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

export type PliteComboboxItem = Readonly<{
  description?: string;
  id: string;
  label: string;
}>;

export type PliteComboboxState = Readonly<{
  point: Point;
  query: string;
  range: Range;
  trigger: string;
  triggerLength: number;
}>;

export type PliteComboboxCommit = (
  item: PliteComboboxItem,
  state: PliteComboboxState
) => void;

const readTriggerAtCaret = (
  editor: ReturnType<typeof useEditor>,
  selection: Range | null
): PliteComboboxState | null => {
  if (!selection || !RangeApi.isCollapsed(selection)) return null;
  const focus = selection.focus;
  const before = editor.read((state) =>
    state.points.before(focus, { unit: 'character' })
  );
  const prefix = before
    ? editor.read((state) => state.text.string({ anchor: before, focus }))
    : '';
  const match = prefix.match(/(?:^|\s)([@#/:])([^\s@#/:]*)$/u);
  if (!match) return null;
  const triggerLength = (match[2]?.length ?? 0) + 1;
  const start = editor.read((state) =>
    state.points.before(focus, {
      distance: triggerLength,
      unit: 'character',
    })
  );
  if (!start) return null;
  return {
    point: focus,
    query: match[2] ?? '',
    range: { anchor: start, focus },
    trigger: match[1]!,
    triggerLength,
  };
};

/** Caret-local trigger/query state for raw Plite editable roots. */
export const usePliteCombobox = ({
  getItems,
  onCommit,
}: {
  getItems: (trigger: string, query: string) => readonly PliteComboboxItem[];
  onCommit: PliteComboboxCommit;
}) => {
  const editor = useEditor();
  const selection = useEditorSelection();
  const state = useMemo(
    () => readTriggerAtCaret(editor, selection),
    [editor, selection]
  );
  const items = useMemo(
    () => (state ? getItems(state.trigger, state.query) : []),
    [getItems, state]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const choose = useCallback(
    (item: PliteComboboxItem | undefined) => {
      if (item && state) onCommit(item, state);
    },
    [onCommit, state]
  );
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!state || !items.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex(
          (current) => (current + delta + items.length) % items.length
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(items[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setActiveIndex(0);
      }
    },
    [activeIndex, choose, items, state]
  );
  return { activeIndex, choose, items, onKeyDown, state };
};

/** Default popup surface; providers own item meaning and commit behavior. */
export const PliteCombobox = ({
  activeIndex,
  items,
  onChoose,
  title,
}: {
  activeIndex: number;
  items: readonly PliteComboboxItem[];
  onChoose: (item: PliteComboboxItem) => void;
  title: ReactNode;
}) => (
  <div className="inline-combobox" contentEditable={false} role="listbox">
    <div className="combo-title">{title}</div>
    {items.map((item, index) => (
      <button
        type="button"
        className={index === activeIndex ? 'active' : ''}
        key={item.id}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onChoose(item)}
        role="option"
        aria-selected={index === activeIndex}
      >
        <span>{item.label}</span><small>{item.description}</small>
      </button>
    ))}
  </div>
);
