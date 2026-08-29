import { RangeApi, type Point, type Range } from '@platejs/plite';
import {
  useEditor,
  useEditorComposing,
  useEditorSelection,
} from '@platejs/plite-react';
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
  const { focus } = selection;
  const prefix = editor.read((state) => {
    const block = state.nodes.block({ at: focus });
    const start = block && state.points.start(block[1]);
    return start ? state.text.string({ anchor: start, focus }) : '';
  });
  const match = prefix.match(/(?:^|\s)([@#/:])([^\s@#/:]*)$/u);
  if (!match) return null;
  const [, trigger, query = ''] = match;
  if (!trigger) return null;
  const triggerLength = query.length + 1;
  const start = editor.read((state) =>
    state.points.before(focus, {
      distance: triggerLength,
      unit: 'character',
    })
  );
  if (!start) return null;
  return {
    point: focus,
    query,
    range: { anchor: start, focus },
    trigger,
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
  const composing = useEditorComposing();
  const selection = useEditorSelection();
  const detected = useMemo(
    () => readTriggerAtCaret(editor, selection),
    [editor, selection]
  );
  const [dismissed, setDismissed] = useState<PliteComboboxState | null>(null);
  const state = detected && detected !== dismissed ? detected : null;
  const items = useMemo(
    () => (state ? getItems(state.trigger, state.query) : []),
    [getItems, state]
  );
  const stateKey = state ? `${state.trigger}:${state.query}` : '';
  const [navigation, setNavigation] = useState({ index: 0, stateKey: '' });
  const activeIndex =
    navigation.stateKey === stateKey
      ? Math.min(navigation.index, Math.max(items.length - 1, 0))
      : 0;
  const choose = useCallback(
    (item: PliteComboboxItem | undefined) => {
      if (item && state) onCommit(item, state);
    },
    [onCommit, state]
  );
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (composing || event.nativeEvent.isComposing || !state) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setDismissed(state);
        return;
      }
      if (!items.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        setNavigation({
          index: (activeIndex + delta + items.length) % items.length,
          stateKey,
        });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        choose(items[activeIndex]);
      }
    },
    [activeIndex, choose, composing, items, state, stateKey]
  );
  return {
    activeIndex,
    choose,
    isOpen: Boolean(state),
    items,
    onKeyDown,
    state,
  };
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
        <span>{item.label}</span>
        <small>{item.description}</small>
      </button>
    ))}
  </div>
);
