# plite-outliner

Domain-free outline tree transactions for Plite editors.

Install the extension to expose the outline operations on every update transaction:

```ts
import { createEditor } from '@platejs/plite';
import { outliner } from '@platejs/plite-outliner';

const editor = createEditor({
  extensions: [outliner()],
  initialValue: [{ type: 'item', children: [{ text: 'First' }] }],
});

editor.update((tx) => {
  tx.outliner.insertSibling({
    at: [0],
    block: { type: 'item', children: [{ text: 'Second' }] },
  });
});
```

The extension supplies `insertSibling`, `splitAtSelection`, `mergeBackward`, `nest`, `unnest`, and `moveBlock`. It operates only on Plite paths, elements, and node selections; applications remain responsible for domain identities and metadata.
