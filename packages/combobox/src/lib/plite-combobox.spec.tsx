import type { Element } from '@platejs/plite';
import { createReactEditor, Plite } from '@platejs/plite-react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';

import { type PliteComboboxItem, usePliteCombobox } from './plite-combobox';

const paragraph = (text: string): Element => ({
  type: 'paragraph',
  children: [{ text }],
});

const item = (id: string): PliteComboboxItem => ({ id, label: id });

const mountCombobox = (
  text: string,
  itemIds = ['first', 'second', 'third']
) => {
  const editor = createReactEditor({ initialValue: [paragraph(text)] });
  editor.update((tx) => {
    tx.selection.set({ path: [0, 0], offset: text.length });
  });
  let current!: ReturnType<typeof usePliteCombobox>;
  let commits = 0;

  const Probe = ({ ids }: { ids: readonly string[] }) => {
    current = usePliteCombobox({
      getItems: () => ids.map(item),
      onCommit: () => {
        commits += 1;
      },
    });

    return (
      <button
        aria-label="Combobox probe"
        data-testid="combobox-probe"
        onKeyDown={current.onKeyDown}
        type="button"
      />
    );
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Plite editor={editor}>{children}</Plite>
  );
  const rendered = render(
    <Wrapper>
      <Probe ids={itemIds} />
    </Wrapper>
  );

  return {
    commits: () => commits,
    current: () => current,
    probe: () => rendered.getByTestId('combobox-probe'),
    rerender: (ids: readonly string[]) =>
      rendered.rerender(
        <Wrapper>
          <Probe ids={ids} />
        </Wrapper>
      ),
  };
};

describe('usePliteCombobox', () => {
  test.each([
    ['@', 'node'],
    ['#', 'tag'],
    [':', 'smile'],
    ['/', 'command'],
  ])('keeps the %s popup open for a sustained query', (trigger, query) => {
    const combobox = mountCombobox(`${trigger}${query}`);

    expect(combobox.current().isOpen).toBe(true);
    expect(combobox.current().state).toMatchObject({ query, trigger });
  });

  test('owns Escape dismissal and keyboard navigation', async () => {
    const combobox = mountCombobox('@node');
    const probe = combobox.probe();

    fireEvent.keyDown(probe, { key: 'ArrowDown' });
    expect(combobox.current().activeIndex).toBe(1);

    fireEvent.keyDown(probe, { key: 'Enter' });
    expect(combobox.commits()).toBe(1);

    fireEvent.keyDown(probe, { key: 'Escape' });
    await waitFor(() => expect(combobox.current().isOpen).toBe(false));
  });

  test('ignores composition commits and clamps navigation to fresh results', async () => {
    const combobox = mountCombobox('#tag');
    const probe = combobox.probe();

    fireEvent.keyDown(probe, { key: 'ArrowUp' });
    expect(combobox.current().activeIndex).toBe(2);

    combobox.rerender(['only']);
    await waitFor(() => expect(combobox.current().activeIndex).toBe(0));

    fireEvent.keyDown(probe, { isComposing: true, key: 'Enter' });
    expect(combobox.commits()).toBe(0);
  });
});
