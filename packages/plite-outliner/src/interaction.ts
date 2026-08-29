export type OutlinerInteraction =
  | 'delete-placement'
  | 'expand'
  | 'merge-backward'
  | 'nest'
  | 'pass'
  | 'split'
  | 'unnest';

export type OutlinerInteractionState = Readonly<{
  comboboxOpen: boolean;
  composing: boolean;
  defaultPrevented: boolean;
  empty: boolean;
  key: string;
  nodeCollapsed: boolean;
  selectionAtRootStart: boolean;
  selectionCollapsed: boolean;
  shift: boolean;
}>;

/** Resolve outline keys in one priority order after inline handlers run. */
export const resolveOutlinerInteraction = ({
  comboboxOpen,
  composing,
  defaultPrevented,
  empty,
  key,
  nodeCollapsed,
  selectionAtRootStart,
  selectionCollapsed,
  shift,
}: OutlinerInteractionState): OutlinerInteraction => {
  if (composing || defaultPrevented || comboboxOpen) return 'pass';
  if (key === 'Enter' && !shift) {
    return nodeCollapsed ? 'expand' : 'split';
  }
  if (key === 'Tab') return shift ? 'unnest' : 'nest';
  if (key !== 'Backspace' || !selectionCollapsed) return 'pass';
  if (empty) return 'delete-placement';
  return selectionAtRootStart ? 'merge-backward' : 'pass';
};
