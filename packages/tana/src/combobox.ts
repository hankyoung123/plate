export type ComboboxTrigger = '#' | '/' | ':' | '@';

export type ComboboxItem = Readonly<{
  description?: string;
  id: string;
  keywords?: readonly string[];
  label: string;
}>;

export type ComboboxState = Readonly<{
  activeIndex: number;
  query: string;
  trigger: ComboboxTrigger;
}>;

const TRIGGERS = new Set<ComboboxTrigger>(['#', '/', ':', '@']);

/** One parser and filter owner for every inline command trigger. */
export const parseCombobox = (text: string): ComboboxState | null => {
  const match = text.match(/(?:^|\s)([@#/:])([^\s@#/:]*)$/u);
  if (!match || !TRIGGERS.has(match[1] as ComboboxTrigger)) return null;
  return {
    activeIndex: 0,
    query: match[2] ?? '',
    trigger: match[1] as ComboboxTrigger,
  };
};

export const filterComboboxItems = (
  items: readonly ComboboxItem[],
  query: string
) => {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter((item) =>
    [item.label, item.description ?? '', ...(item.keywords ?? [])]
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle)
  );
};
