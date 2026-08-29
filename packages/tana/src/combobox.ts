export type ComboboxTrigger = '#' | '/' | ':' | '@';

export type ComboboxItem = Readonly<{
  description?: string;
  id: string;
  keywords?: readonly string[];
  label: string;
}>;

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
