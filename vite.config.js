import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
      },
    },
  },
});
