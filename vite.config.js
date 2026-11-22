import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
        about: resolve(import.meta.dirname, 'about/index.html'),
        terms: resolve(import.meta.dirname, 'terms/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy-policy/index.html'),
        contact: resolve(import.meta.dirname, 'contact/index.html'),
      },
    },
  },
});
