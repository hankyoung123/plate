import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  resolve: {
    alias: {
      '@platejs/plite/internal': source(
        '../../packages/plite/src/internal/index.ts'
      ),
      '@platejs/plite-dom/internal': source(
        '../../packages/plite-dom/src/internal/index.ts'
      ),
      '@platejs/plite-dom': source('../../packages/plite-dom/src/index.ts'),
      '@platejs/plite': source('../../packages/plite/src/index.ts'),
      '@platejs/plite-history': source(
        '../../packages/plite-history/src/index.ts'
      ),
      '@platejs/plite-outliner': source(
        '../../packages/plite-outliner/src/index.ts'
      ),
      '@platejs/plite-react': source('../../packages/plite-react/src/index.ts'),
      '@platejs/tana': source('../../packages/tana/src/index.ts'),
    },
  },
  server: { host: '127.0.0.1', port: 1420, strictPort: true },
});
