import type { EditorUpdateTransaction } from '@platejs/plite';
import { history } from '@platejs/plite-history';
import { outliner } from '@platejs/plite-outliner';
import type { ReactEditor } from '@platejs/plite-react';
import { tana, TanaSchema, type TanaDocument } from '@platejs/tana';

export const createLocalTanaExtensions = () => {
  const outlinerExtension = outliner();
  return [
    history(),
    outlinerExtension,
    TanaSchema,
    tana(outlinerExtension),
  ] as const;
};

export type LocalTanaExtensions = ReturnType<typeof createLocalTanaExtensions>;
export type LocalTanaEditor = ReactEditor<
  TanaDocument['children'],
  LocalTanaExtensions
>;
export type LocalTanaTransaction = EditorUpdateTransaction<
  TanaDocument['children'],
  LocalTanaExtensions
>;
